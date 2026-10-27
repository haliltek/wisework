// Docker Engine API istemcisi (yalnızca okuma).
// Panel Docker soketine DOĞRUDAN erişmez; salt-okunur bir vekil (docker-proxy) üzerinden
// DOCKER_API_URL adresine bağlanır. Vekil yalnızca GET isteklerine ve konteyner/bilgi
// uç noktalarına izin verecek şekilde yapılandırılır.

const ZAMAN_ASIMI_MS = 5000;

export type KonteynerDurumKodu = "RUNNING" | "STOPPED" | "ERROR" | "SLEEPING";

export interface KonteynerOzeti {
  id: string;
  ad: string;
  imaj: string;
  durumKodu: KonteynerDurumKodu;
  durumMetni: string; // Docker'ın verdiği ham metin (örn. "Up 3 days")
  projeAdi: string | null; // docker compose proje adı
  portlar: string[];
  olusturma: Date;
  bellekMb: number | null;
  bellekLimitMb: number | null;
}

export interface DockerOzeti {
  toplam: number;
  calisan: number;
  durdurulan: number;
  imajSayisi: number;
  surum: string;
  bellekToplamGb: number;
  cekirdek: number;
}

export function dockerYapilandirildiMi(): boolean {
  return Boolean(process.env.DOCKER_API_URL);
}

async function dockerGet<T>(yol: string): Promise<T> {
  const taban = process.env.DOCKER_API_URL;
  if (!taban) throw new Error("DOCKER_API_URL tanımlı değil.");
  const yanit = await fetch(`${taban}${yol}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
  });
  if (!yanit.ok) throw new Error(`Docker API ${yanit.status} döndürdü: ${yol}`);
  return (await yanit.json()) as T;
}

interface HamKonteyner {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Labels?: Record<string, string>;
  Ports?: { PrivatePort: number; PublicPort?: number; Type: string; IP?: string }[];
}

interface HamIstatistik {
  memory_stats?: { usage?: number; limit?: number; stats?: Record<string, number> };
}

function durumKodu(state: string): KonteynerDurumKodu {
  if (state === "running") return "RUNNING";
  if (state === "exited" || state === "created" || state === "paused") return "STOPPED";
  return "ERROR"; // restarting, dead, removing
}

function portMetni(p: { PrivatePort: number; PublicPort?: number; Type: string; IP?: string }): string {
  return p.PublicPort ? `${p.IP ?? "0.0.0.0"}:${p.PublicPort}->${p.PrivatePort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`;
}

// Tek bir konteynerin anlık bellek kullanımı (önbellek hariç). Hata olursa null.
async function bellekOku(id: string): Promise<{ kullanilanMb: number; limitMb: number } | null> {
  try {
    const s = await dockerGet<HamIstatistik>(`/containers/${id}/stats?stream=false&one-shot=true`);
    const kullanim = s.memory_stats?.usage;
    if (kullanim == null) return null;
    const onbellek = s.memory_stats?.stats?.inactive_file ?? s.memory_stats?.stats?.cache ?? 0;
    return {
      kullanilanMb: Math.max(0, kullanim - onbellek) / 1024 ** 2,
      limitMb: (s.memory_stats?.limit ?? 0) / 1024 ** 2,
    };
  } catch {
    return null;
  }
}

export async function konteynerleriListele(): Promise<KonteynerOzeti[]> {
  const ham = await dockerGet<HamKonteyner[]>("/containers/json?all=true");

  const sonuc = await Promise.all(
    ham.map(async (k): Promise<KonteynerOzeti> => {
      const bellek = k.State === "running" ? await bellekOku(k.Id) : null;
      return {
        id: k.Id,
        ad: (k.Names[0] ?? k.Id).replace(/^\//, ""),
        imaj: k.Image,
        durumKodu: durumKodu(k.State),
        durumMetni: k.Status,
        projeAdi: k.Labels?.["com.docker.compose.project"] ?? null,
        portlar: Array.from(new Set((k.Ports ?? []).filter((p) => p.PublicPort).map(portMetni))),
        olusturma: new Date(k.Created * 1000),
        bellekMb: bellek?.kullanilanMb ?? null,
        bellekLimitMb: bellek && bellek.limitMb > 0 ? bellek.limitMb : null,
      };
    }),
  );

  // Çalışanlar önce, sonra ada göre
  return sonuc.sort((a, b) => {
    if (a.durumKodu !== b.durumKodu) return a.durumKodu === "RUNNING" ? -1 : b.durumKodu === "RUNNING" ? 1 : 0;
    return a.ad.localeCompare(b.ad);
  });
}

export async function dockerOzetiAl(): Promise<DockerOzeti> {
  const b = await dockerGet<{
    Containers: number;
    ContainersRunning: number;
    ContainersStopped: number;
    Images: number;
    ServerVersion: string;
    MemTotal: number;
    NCPU: number;
  }>("/info");
  return {
    toplam: b.Containers,
    calisan: b.ContainersRunning,
    durdurulan: b.ContainersStopped,
    imajSayisi: b.Images,
    surum: b.ServerVersion,
    bellekToplamGb: b.MemTotal / 1024 ** 3,
    cekirdek: b.NCPU,
  };
}
