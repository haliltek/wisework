#!/bin/sh
# Sağlayıcı anahtarını şifreleyip veritabanına yazar. Sunucuda, kök kullanıcıyla çalıştırılır:
#   sh /opt/software-factory/app/scripts/provider-anahtar.sh
# Anahtar ekrana yazılmaz, sohbete veya komut geçmişine girmez; yalnızca şifreli hali saklanır.
set -e
cd /opt/software-factory

echo "Hangi sağlayıcının anahtarını kaydedeceksiniz?"
echo "  1) DigitalOcean (salt okunur token)"
echo "  2) OpenRouter (yönetim anahtarı)"
echo "  3) Cloudflare (salt okunur API token)"
echo "  4) DomainNameAPI (Bayi ID + API anahtarı)"
printf "Seçim (1-4): "
read -r SECIM
case "$SECIM" in
  1) KIND=DIGITALOCEAN; HESAP_ID=do-account-main; ETIKET="DigitalOcean - Ana Hesap" ;;
  2) KIND=OPENROUTER; HESAP_ID=openrouter-main; ETIKET="OpenRouter - Ana Hesap" ;;
  3) KIND=CLOUDFLARE; HESAP_ID=cloudflare-main; ETIKET="Cloudflare - Ana Hesap" ;;
  4) KIND=DOMAINNAMEAPI; HESAP_ID=domainnameapi-main; ETIKET="DomainNameAPI - Ana Hesap" ;;
  *) echo "Geçersiz seçim."; exit 1 ;;
esac

MOD=duz
if [ "$KIND" = "DOMAINNAMEAPI" ]; then
  MOD=json
  printf "Bayi ID'yi yapıştırıp Enter'a basın (yazarken görünmez): "
  stty -echo
  read -r BAYI_ID
  stty echo
  echo
  # Yalnızca harf, rakam ve tire kabul edilir (JSON'a güvenli yerleştirme için)
  case "$BAYI_ID" in *[!A-Za-z0-9-]*|"") echo "Geçersiz Bayi ID."; exit 1 ;; esac
fi

printf "API anahtarını yapıştırıp Enter'a basın (yazarken görünmez): "
stty -echo
read -r ANAHTAR
stty echo
echo

if [ "$MOD" = "json" ]; then
  case "$ANAHTAR" in *[!A-Za-z0-9_-]*|"") echo "Geçersiz API anahtarı."; exit 1 ;; esac
  ANAHTAR=$(printf '{"resellerId":"%s","apiKey":"%s"}' "$BAYI_ID" "$ANAHTAR")
  unset BAYI_ID
fi

SONUC=$(printf '%s' "$ANAHTAR" | docker run --rm -i --env-file app.env \
  -v /opt/software-factory/app/scripts:/s:ro node:22-bookworm-slim node /s/sifrele.mjs "$MOD")
unset ANAHTAR
PAKET=${SONUC%%|*}
IPUCU=${SONUC#*|}

echo "INSERT INTO \"ProviderAccount\" (id, kind, label, \"syncMode\", credentials, \"credentialHint\")
VALUES (:'hid', :'kind', :'etiket', 'AUTO', :'paket', :'ipucu')
ON CONFLICT (id) DO UPDATE SET credentials = EXCLUDED.credentials,
  \"credentialHint\" = EXCLUDED.\"credentialHint\", \"syncMode\" = 'AUTO', \"isActive\" = true;" \
| docker exec -i wise-postgres psql -U sf_user -d software_factory -v ON_ERROR_STOP=1 \
  -v "hid=$HESAP_ID" -v "kind=$KIND" -v "etiket=$ETIKET" -v "paket=$PAKET" -v "ipucu=$IPUCU"

echo "Tamam: $ETIKET için anahtar şifreli olarak kaydedildi (ipucu: $IPUCU)."
echo "Panelde Sağlayıcı Hesapları ekranından 'Eşitle' düğmesine basabilirsiniz."
