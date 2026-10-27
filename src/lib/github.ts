import type { DeployStatus } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

// GitHub REST istemcisi (Octokit yerine fetch: ek paket gerekmez).
// Token, ProviderAccount "github-main" kaydında şifreli saklanır; hata mesajlarına yazılmaz.
export const GITHUB_HESAP_ID = "github-main";

const DAL_DESENI = /^[A-Za-z0-9._/-]+$/;
const IS_AKISI_DESENI = /^[A-Za-z0-9_.-]+\.ya?ml$/;

export function dalGecerliMi(dal: string): boolean {
  return DAL_DESENI.test(dal) && !dal.includes("..");
}

export function isAkisiGecerliMi(dosya: string): boolean {
  return IS_AKISI_DESENI.test(dosya);
}

// "https://github.com/sahip/depo" -> { owner, repo }; geçersizse null
export function repoCoz(url?: string | null): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.trim().match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  return m && m[1] && m[2] ? { owner: m[1], repo: m[2] } : null;
}

export async function githubToken(): Promise<string | null> {
  const kayit = await prisma.providerAccount.findUnique({ where: { id: GITHUB_HESAP_ID } });
  if (!kayit?.credentials || !kayit.isActive) return null;
  return decryptSecret(kayit.credentials);
}

async function gh(yol: string, token: string | null, init: RequestInit = {}): Promise<Response> {
  const basliklar: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) basliklar.Authorization = `Bearer ${token}`;
  if (init.body) basliklar["Content-Type"] = "application/json";
  return fetch(`https://api.github.com${yol}`, {
    ...init,
    headers: basliklar,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

function hataMesaji(durum: number): string {
  if (durum === 401) return "GitHub token'ı geçersiz veya süresi dolmuş.";
  if (durum === 403) return "GitHub izni yetersiz veya istek sınırı aşıldı.";
  if (durum === 404) return "Depo, iş akışı veya dal bulunamadı (token'ın bu depoya erişimi olmayabilir).";
  if (durum === 422) return "GitHub isteği reddetti (dal veya iş akışı geçersiz, iş akışında workflow_dispatch olmayabilir).";
  return `GitHub ${durum} durum kodu döndürdü.`;
}

export interface CommitOzeti {
  sha: string;
  mesaj: string;
  yazar: string;
  tarih: string;
  url: string;
}

export async function sonCommitler(owner: string, repo: string, dal: string, token: string | null): Promise<CommitOzeti[]> {
  const yanit = await gh(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(dal)}&per_page=5`, token);
  if (!yanit.ok) throw new Error(hataMesaji(yanit.status));
  const liste = (await yanit.json()) as {
    sha: string;
    html_url: string;
    commit: { message: string; author?: { name?: string; date?: string } };
  }[];
  return liste.map((c) => ({
    sha: c.sha.slice(0, 7),
    mesaj: c.commit.message.split("\n")[0] ?? "",
    yazar: c.commit.author?.name ?? "-",
    tarih: c.commit.author?.date ?? "",
    url: c.html_url,
  }));
}

export async function sonSurum(owner: string, repo: string, token: string | null): Promise<{ etiket: string; tarih: string; url: string } | null> {
  const yanit = await gh(`/repos/${owner}/${repo}/releases/latest`, token);
  if (yanit.status === 404) return null; // henüz sürüm yok
  if (!yanit.ok) throw new Error(hataMesaji(yanit.status));
  const s = (await yanit.json()) as { tag_name: string; published_at: string; html_url: string };
  return { etiket: s.tag_name, tarih: s.published_at, url: s.html_url };
}

export async function isAkisiniTetikle(owner: string, repo: string, dosya: string, dal: string, token: string): Promise<void> {
  const yanit = await gh(`/repos/${owner}/${repo}/actions/workflows/${dosya}/dispatches`, token, {
    method: "POST",
    body: JSON.stringify({ ref: dal }),
  });
  if (yanit.status !== 204) throw new Error(hataMesaji(yanit.status));
}

export interface CalismaOzeti {
  id: number;
  url: string;
  durum: DeployStatus;
  sha: string;
}

function calismaHaritasi(h: { id: number; html_url: string; status: string; conclusion: string | null; head_sha: string }): CalismaOzeti {
  let durum: DeployStatus;
  if (h.status === "completed") {
    durum = h.conclusion === "success" ? "SUCCESS" : h.conclusion === "cancelled" ? "CANCELLED" : "FAILED";
  } else if (h.status === "in_progress") {
    durum = "RUNNING";
  } else {
    durum = "QUEUED";
  }
  return { id: h.id, url: h.html_url, durum, sha: h.head_sha.slice(0, 7) };
}

// Tetiklemeden sonra oluşan çalışmayı bulur (tetikleme zamanından hemen sonra başlayan en yeni çalışma)
export async function calismayiBul(owner: string, repo: string, dosya: string, dal: string, sonra: Date, token: string): Promise<CalismaOzeti | null> {
  const yanit = await gh(
    `/repos/${owner}/${repo}/actions/workflows/${dosya}/runs?event=workflow_dispatch&branch=${encodeURIComponent(dal)}&per_page=5`,
    token,
  );
  if (!yanit.ok) throw new Error(hataMesaji(yanit.status));
  const govde = (await yanit.json()) as {
    workflow_runs: { id: number; html_url: string; status: string; conclusion: string | null; head_sha: string; created_at: string }[];
  };
  const esik = sonra.getTime() - 15000; // saat farkına karşı payı
  const aday = govde.workflow_runs.find((r) => new Date(r.created_at).getTime() >= esik);
  return aday ? calismaHaritasi(aday) : null;
}

export async function calismaDurumu(owner: string, repo: string, runId: string, token: string): Promise<CalismaOzeti> {
  const yanit = await gh(`/repos/${owner}/${repo}/actions/runs/${encodeURIComponent(runId)}`, token);
  if (!yanit.ok) throw new Error(hataMesaji(yanit.status));
  return calismaHaritasi((await yanit.json()) as Parameters<typeof calismaHaritasi>[0]);
}
