# Acil Epikriz — Proje Notları

**Amaç:** Acil servis hekiminin hızlıca kutu işaretleyerek profesyonel bir epikriz / hasta notu üretmesini sağlayan araç. Hedef: önce web, sonra iOS App Store uygulaması.

**Ana dosya:** `index.html` (tek dosya — HTML + CSS + JS; web kökünden otomatik açılır)

---

## Değişmez kurallar (bunları bozma)

1. **Şablon temelli.** Yapay zekâ ile metin üretimi YOK. Hekim ne işaretlerse o yazıya dökülür; araç asla klinik içerik uydurmaz/eklemez. Halüsinasyon riski sıfır olmalı.
2. **Tüm işlem tarayıcıda (client-side).** Hasta verisi hiçbir sunucuya/ API'ye gitmez. KVKK gereği bu kritik. Hiçbir veri toplama, çağrı, depolama eklenmemeli.
3. **Türkçe** arayüz ve çıktı. Tüm tıbbi terminoloji Türkçe acil pratiğine uygun.
4. **Hız her şeyden önce gelir.** Araç bir hekimin saniyeler içinde tıklayıp epikriz çıkarması için var. Bir özellik tıklama sayısını/karmaşıklığı artırıyorsa, gözden geçir.
5. **Sorumluluk reddi / uyarı yazısı ekleme.** Kullanıcı (hekim) açıkça istemedikçe tool'lara "klinik karar destek aracıdır, ... yerine geçmez" türü disclaimer/uyarı metinleri KOYMA. (Klinik yönlendirme/karar çıktısı ayrı şeydir; bu kural yalnızca disclaimer/CYA boilerplate içindir.)

## Mevcut durum

- Sol panel: işaretlenecek bölümler. Sağ panel: canlı oluşan epikriz önizlemesi.
- Bölümler (dahili sırası): Hasta, GKS, Başvuru Şikayeti, Vital Bulgular (+EKG), Hikaye, Özgeçmiş, Alerji, Düzenli İlaçlar, Fizik Muayene, Uygulanan Tedavi, Karar, Öneriler. *(Vital, başvuru şikayetinin hemen ardında.)*
- **Dinamik detay panelleri:** bir şikayet seçilince (ör. göğüs ağrısı) altında ona özel sorular açılıyor (süre, nitelik, efor ilişkisi vb.). Veri yapısı `followups` objesinde; yeni şikayet eklemek kolay.
- "Karar" seçimi otomatik tam cümle kuruyor (taburcu/yatış/sevk/konsültasyon).
- Kopyala (HBYS'ye yapıştırmak için) ve Yazdır butonları var.
- **3 mod:** Acil Dahili / Adli Muayene / Travma (her mod farklı bölümleri gösterir).
- **Sağ panel araçları (katlanabilir; epikriz notuna dahil değil):**
  - **Klinik Skorlamalar:** ABCD2, TIMI, HEART, CHA₂DS₂-VASc, CURB-65, qSOFA, Glasgow-Blatchford, Wells (PE/DVT), NEXUS, Canadian C-Spine, PECARN (<2/≥2 yaş), Centor, PSI.
  - **Hesaplayıcılar:** Parkland (yanık sıvısı), Ped. ETT boyutu.
  - **Klinik Yönlendirme — Parasetamol:** alım paterni (akut/tekrarlı/güvenilmez) + doz/kilo/süre/serum düzeyi/AST'ye göre doz-temelli tedavi yönlendirmesi (toksik eşik ≥150 mg/kg veya 7,5 g, aktif kömür, nomogram zamanlaması, >8 sa ampirik NAC, >30 g masif uyarısı) + kilodan otomatik NAC doz rejimi (IV 21 sa / oral 72 sa / SNAP). Eşikler UpToDate "Acetaminophen poisoning: Management" (Apr 2026) makalesine dayalı — dev referansı, kod içi yorumda da var.
- **Görünüm:** Windows 98 estetiği — gri zemin, Arial, kabarık 3D bevel butonlar, lacivert başlık çubukları, seçili kutularda ✓.

## Sıradaki iş: Bates muayene içeriği

Yüklenen kaynak: Bates' Guide to Physical Examination (PDF).

**Dikkat — "her şeyi ekle" tuzağı:** Bates ~1000 sayfa. Hepsini düz checkbox'a dökmek aracı yavaşlatır ve hız avantajını yok eder. Doğru yaklaşım:

- Sisteme göre düzenlenmiş (kardiyovasküler, solunum, batın, nörolojik, kas-iskelet, baş-boyun vb.) **derin ama katlanabilir (collapsible)** bir muayene modülü.
- Varsayılan görünüm sade kalsın; hekim istediği sistemi açınca o sistemin ayrıntılı normal/patolojik bulgu seçenekleri gelsin.
- Normal bulgular tek tıkla toplu işaretlenebilsin ("tümü doğal" gibi), sonra hekim sapanları değiştirsin.
- Terminoloji ve sınıflandırma Bates'e sadık; ama çıktı acil epikriz diline uygun, kısa.

## Uzak hedef: iOS App Store

- Web → iOS için muhtemelen Capacitor (mevcut HTML'i sarmalar) veya Flutter.
- Gerekenler: Apple Developer hesabı (99 $/yıl), Mac + Xcode, gizlilik politikası URL'si, tıbbi uygulama incelemesi için net sorumluluk reddi ("klinik karar destek aracıdır, hekim muhakemesinin yerini almaz").

## Geliştirme / bakım

- **Tek dosya, build yok.** `index.html` doğrudan açılır/dağıtılır. QR senkron kütüphaneleri (qrcodejs, jsQR) dosyaya GÖMÜLÜ (üstteki ~10000 satır) — offline çalışır, harici CDN yok. Elle düzenlenmez; uygulama kodu "UYGULAMA SCRIPT'İ BAŞLANGICI" işaretinden sonra başlar, başında aranabilir bir İÇİNDEKİLER (TOC) var.
- **Testler:** `node test.js` — klinik mantık regresyon ağı (15 skor + parasetamol + NAC). Klinik eşik/ifade düzenleyince çalıştır; bozulursa kırmızı verir.
- **State anahtarları içeriğe dayalı** (`computeBaseKey`): chip/bölüm taşınsa da kaydedilmiş/senkron durum doğru kutuya yüklenir (DOM konumuna bağlı değil).

## Güvenlik notu

Cowork/Code'un "computer use" özelliğini HBYS'ye veya gerçek hasta verisi olan sistemlere BAĞLAMA. Geliştirme tamamen yerel dosya üzerinde yapılır; gerçek hasta verisi kullanılmaz.
