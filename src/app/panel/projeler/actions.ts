"use server";

import { randomBytes } from "node:crypto";
import type { DeployStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import {
  calismaDurumu,
  calismayiBul,
  dalGecerliMi,
  githubToken,
  isAkisiGecerliMi,
  isAkisiniTetikle,
  repoCoz,
} from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

const AKTIF_DURUMLAR: DeployStatus[] = ["QUEUED", "RUNNING"];
const ZAMAN_ASIMI_MS = 30 * 60 * 1000; // bu süreden eski "devam eden" dağıtım yeni dağıtımı engellemez
const CALISMA_BULMA_MS = 10 * 60 * 1000; // bu süre içinde GitHub'da çalışma bulunamazsa dağıtım başarısız sayılır

function bildir(slug: string, tur: "hata" | "ok", mesaj: string): never {
  redirect(`/panel/projeler/${slug}?${tur}=${encodeURIComponent(mesaj)}`);
}

function metin(f: FormData, ad: string): string {
  return String(f.get(ad) ?? "").trim();
}

function bekle(ms: number) {
  return new Promise((coz) => setTimeout(coz, ms));
}

function hataMetni(h: unknown): string {
  return h instanceof Error ? h.message : "Bilinmeyen hata.";
}

// ---------- Dağıt ----------
export async function dagitAction(formVerisi: FormData): Promise<void> {
  const kullanici = await requirePermission("deploy:run");
  const ortam = await prisma.projectEnvironment.findUnique({
    where: { id: metin(formVerisi, "ortamId") },
    include: { project: true },
  });
  if (!ortam) redirect("/panel/projeler");
  const slug = ortam.project.slug;

  const repo = repoCoz(ortam.project.githubRepoUrl);
  if (!repo) bildir(slug, "hata", "Projeye geçerli bir GitHub deposu bağlı değil.");
  if (!isAkisiGecerliMi(ortam.workflowFile) || !dalGecerliMi(ortam.branch)) {
    bildir(slug, "hata", "Ortamın dal veya iş akışı adı geçersiz.");
  }
  const token = await githubToken();
  if (!token) bildir(slug, "hata", "GitHub token'ı tanımlı değil. Sunucuda provider-anahtar.sh betiğiyle ekleyin.");

  const devamEden = await prisma.deployment.findFirst({
    where: { environmentId: ortam.id, status: { in: AKTIF_DURUMLAR }, startedAt: { gt: new Date(Date.now() - ZAMAN_ASIMI_MS) } },
  });
  if (devamEden) bildir(slug, "hata", "Bu ortamda devam eden bir dağıtım var. Bitmesini bekleyin.");

  const dagitim = await prisma.deployment.create({
    data: { environmentId: ortam.id, triggeredById: kullanici.id, ref: ortam.branch },
  });

  let hata: string | null = null;
  try {
    // Denetim kaydı yazılamazsa dağıtım tetiklenmez (hata yakalanır ve dağıtım başarısız işaretlenir)
    await writeAudit({
      userId: kullanici.id,
      action: "deploy.start",
      entityType: "ProjectEnvironment",
      entityId: ortam.id,
      summary: `${ortam.project.title} projesi ${ortam.name} ortamına dağıtılıyor (dal: ${ortam.branch})`,
      meta: { deploymentId: dagitim.id },
    });
    await isAkisiniTetikle(repo.owner, repo.repo, ortam.workflowFile, ortam.branch, token);
    await bekle(4000); // GitHub çalışmayı oluştururken kısa bir gecikme olur
    const calisma = await calismayiBul(repo.owner, repo.repo, ortam.workflowFile, ortam.branch, dagitim.startedAt, token);
    if (calisma) {
      await prisma.deployment.update({
        where: { id: dagitim.id },
        data: { githubRunId: String(calisma.id), runUrl: calisma.url, status: calisma.durum },
      });
    }
  } catch (h) {
    hata = hataMetni(h);
    await prisma.deployment.update({ where: { id: dagitim.id }, data: { status: "FAILED", finishedAt: new Date() } });
  }

  await prisma.projectEnvironment.update({
    where: { id: ortam.id },
    data: { lastDeployAt: new Date(), lastDeployStatus: hata ? "FAILED" : "QUEUED" },
  });
  revalidatePath(`/panel/projeler/${slug}`);
  if (hata) bildir(slug, "hata", `Dağıtım başlatılamadı: ${hata}`);
  bildir(slug, "ok", "Dağıtım tetiklendi. Durum otomatik güncellenecek.");
}

// ---------- Durum yenileme (sayfa açıkken istemciden periyodik çağrılır) ----------
export async function dagitimDurumunuYenile(slug: string): Promise<void> {
  await requirePermission("projects:view");
  const proje = await prisma.project.findUnique({ where: { slug }, select: { githubRepoUrl: true } });
  const repo = repoCoz(proje?.githubRepoUrl);
  if (!proje || !repo) return;
  const token = await githubToken();
  if (!token) return;

  const aktifler = await prisma.deployment.findMany({
    where: { status: { in: AKTIF_DURUMLAR }, environment: { project: { slug } } },
    include: { environment: true },
  });

  for (const d of aktifler) {
    try {
      const calisma = d.githubRunId
        ? await calismaDurumu(repo.owner, repo.repo, d.githubRunId, token)
        : await calismayiBul(repo.owner, repo.repo, d.environment.workflowFile, d.environment.branch, d.startedAt, token);

      let yeniDurum: DeployStatus = d.status;
      const veri: { status?: DeployStatus; githubRunId?: string; runUrl?: string; finishedAt?: Date } = {};
      if (calisma) {
        yeniDurum = calisma.durum;
        veri.status = calisma.durum;
        veri.githubRunId = String(calisma.id);
        veri.runUrl = calisma.url;
      } else if (Date.now() - d.startedAt.getTime() > CALISMA_BULMA_MS) {
        yeniDurum = "FAILED"; // GitHub'da karşılık gelen çalışma bulunamadı
        veri.status = "FAILED";
      }

      const bitti = !AKTIF_DURUMLAR.includes(yeniDurum);
      if (bitti) veri.finishedAt = new Date();
      await prisma.deployment.update({ where: { id: d.id }, data: veri });

      if (bitti) {
        await prisma.projectEnvironment.update({
          where: { id: d.environmentId },
          data: {
            lastDeployStatus: yeniDurum,
            lastDeployAt: new Date(),
            ...(yeniDurum === "SUCCESS" && calisma ? { currentVersion: calisma.sha } : {}),
          },
        });
        await writeAudit({
          userId: d.triggeredById,
          action: "deploy.finish",
          entityType: "ProjectEnvironment",
          entityId: d.environmentId,
          summary: `${d.environment.name} ortamı dağıtımı sonuçlandı: ${yeniDurum === "SUCCESS" ? "başarılı" : yeniDurum === "CANCELLED" ? "iptal edildi" : "başarısız"}`,
          meta: { deploymentId: d.id },
        });
      }
    } catch {
      // Geçici GitHub hatalarında bir sonraki yoklamada tekrar denenir
    }
  }
  revalidatePath(`/panel/projeler/${slug}`);
}

// ---------- Depo bağlama ----------
export async function depoBaglaAction(formVerisi: FormData): Promise<void> {
  const kullanici = await requirePermission("projects:manage");
  const projeId = metin(formVerisi, "projeId");
  const proje = await prisma.project.findUnique({ where: { id: projeId }, select: { slug: true, title: true } });
  if (!proje) redirect("/panel/projeler");

  const url = metin(formVerisi, "depoUrl");
  const repo = repoCoz(url);
  if (!repo) bildir(proje.slug, "hata", "Geçerli bir GitHub adresi girin (örn. https://github.com/sahip/depo).");

  await writeAudit({
    userId: kullanici.id,
    action: "project.repo_link",
    entityType: "Project",
    entityId: projeId,
    summary: `${proje.title} projesine ${repo.owner}/${repo.repo} deposu bağlandı`,
  });
  await prisma.project.update({ where: { id: projeId }, data: { githubRepoUrl: `https://github.com/${repo.owner}/${repo.repo}` } });
  revalidatePath(`/panel/projeler/${proje.slug}`);
  bildir(proje.slug, "ok", "Depo bağlandı.");
}

// ---------- Ortam ekleme ----------
export async function ortamEkleAction(formVerisi: FormData): Promise<void> {
  const kullanici = await requirePermission("projects:manage");
  const projeId = metin(formVerisi, "projeId");
  const proje = await prisma.project.findUnique({ where: { id: projeId }, select: { slug: true, title: true } });
  if (!proje) redirect("/panel/projeler");

  const ad = metin(formVerisi, "ad");
  const sunucuId = metin(formVerisi, "sunucuId");
  const dal = metin(formVerisi, "dal") || "main";
  const isAkisi = metin(formVerisi, "isAkisi") || "deploy.yml";
  const saglikUrl = metin(formVerisi, "saglikUrl");
  const konteyner = metin(formVerisi, "konteyner");
  const alanAdiId = metin(formVerisi, "alanAdiId");

  if (ad !== "production" && ad !== "staging") bildir(proje.slug, "hata", "Ortam adı Üretim veya Hazırlık olmalıdır.");
  if (!dalGecerliMi(dal)) bildir(proje.slug, "hata", "Dal adı geçersiz.");
  if (!isAkisiGecerliMi(isAkisi)) bildir(proje.slug, "hata", "İş akışı dosya adı geçersiz (örn. deploy.yml).");
  if (saglikUrl && !/^https?:\/\/[^\s]+$/.test(saglikUrl)) bildir(proje.slug, "hata", "Sağlık adresi http:// veya https:// ile başlamalıdır.");
  const sunucu = await prisma.serverNode.findUnique({ where: { id: sunucuId }, select: { id: true } });
  if (!sunucu) bildir(proje.slug, "hata", "Sunucu seçin.");

  const mevcutOrtam = await prisma.projectEnvironment.findUnique({ where: { projectId_name: { projectId: projeId, name: ad } } });
  if (mevcutOrtam) bildir(proje.slug, "hata", "Bu projede aynı adlı ortam zaten var.");

  const olusan = await prisma.projectEnvironment.create({
    data: {
      projectId: projeId,
      name: ad,
      serverId: sunucu.id,
      branch: dal,
      workflowFile: isAkisi,
      healthUrl: saglikUrl || null,
      containerName: konteyner || null,
      domainId: alanAdiId || null,
    },
  });
  await writeAudit({
    userId: kullanici.id,
    action: "environment.create",
    entityType: "ProjectEnvironment",
    entityId: olusan.id,
    summary: `${proje.title} projesine ${ad === "production" ? "Üretim" : "Hazırlık"} ortamı eklendi`,
  });
  revalidatePath(`/panel/projeler/${proje.slug}`);
  bildir(proje.slug, "ok", "Ortam eklendi.");
}

// ---------- Yeni proje ----------
function slugOlustur(baslik: string): string {
  const harita: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  const temiz = baslik
    .toLowerCase()
    .replace(/[çğıöşü]/g, (h) => harita[h] ?? h)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return temiz || "proje";
}

export async function projeEkleAction(formVerisi: FormData): Promise<void> {
  const kullanici = await requirePermission("projects:manage");
  const baslik = metin(formVerisi, "baslik");
  const sektorId = metin(formVerisi, "sektorId");
  const tur = metin(formVerisi, "tur");
  const ozet = metin(formVerisi, "ozet");
  const depoUrl = metin(formVerisi, "depoUrl");

  const turler = ["WEB_SOFTWARE", "SAAS_PLATFORM", "MOBILE_APP", "DESKTOP_ERP"] as const;
  type Tur = (typeof turler)[number];
  const turGecerli = turler.find((t): t is Tur => t === tur);

  if (!baslik || !ozet || !turGecerli) redirect("/panel/projeler?hata=" + encodeURIComponent("Başlık, tür ve kısa açıklama zorunludur."));
  const sektor = await prisma.sector.findUnique({ where: { id: sektorId }, select: { id: true } });
  if (!sektor) redirect("/panel/projeler?hata=" + encodeURIComponent("Sektör seçin."));
  let depo: string | null = null;
  if (depoUrl) {
    const r = repoCoz(depoUrl);
    if (!r) redirect("/panel/projeler?hata=" + encodeURIComponent("GitHub adresi geçersiz."));
    depo = `https://github.com/${r.owner}/${r.repo}`;
  }

  let slug = slugOlustur(baslik);
  if (await prisma.project.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  // İç projeler vitrinde görünmesin diye yayında değil olarak açılır
  const olusan = await prisma.project.create({
    data: {
      title: baslik,
      slug,
      type: turGecerli,
      sectorId: sektor.id,
      shortSummary: ozet,
      detailedPitch: "",
      techStack: [],
      basePrice: 0,
      githubRepoUrl: depo,
      isPublished: false,
    },
  });
  await writeAudit({
    userId: kullanici.id,
    action: "project.create",
    entityType: "Project",
    entityId: olusan.id,
    summary: `${baslik} projesi oluşturuldu`,
  });
  revalidatePath("/panel/projeler");
  redirect(`/panel/projeler/${slug}`);
}
