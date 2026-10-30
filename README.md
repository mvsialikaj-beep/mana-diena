# Mana diena

Personīgs dienas plānotājs ar darba un ikdienas uzdevumiem. Lietotne darbojas GitHub Pages, bet uzdevumi un fona paziņojumu abonementi glabājas Supabase projektā `szjzigtavauimamgiaoe`.

## Fona paziņojumi telefonā

1. Atver lietotni telefonā un pieraksties ar to pašu kontu, ar kuru sinhronizē uzdevumus.
2. Sadaļā **Iestatījumi un datu kopija** spied **Ieslēgt fona paziņojumus** un atļauj paziņojumus.
3. iPhone telefonā vispirms pievieno lietotni sākuma ekrānam un atver to no turienes.

Uzdevumam var ieslēgt atgādinājumu tā dienā no plkst. 09:00. Uzdevumiem ar norādītu laiku atgādinājums 15 minūtes pirms sākuma darbojas automātiski. Servera plānotājs pārbauda atgādinājumus katru minūti, tāpēc lietotnei nav jābūt atvērtai.

## Uzturēšana

- `supabase/functions/send-reminders/` satur servera nosūtīšanu un laika aprēķinus.
- `supabase/migrations/` satur paziņojumu tabulas un minūtes plānotāju.
- VAPID privātā atslēga un plānotāja piekļuves tokens glabājas Supabase Vault. Tos nedrīkst ievietot šajā repozitorijā.
- `sw.js` saņem push ziņojumus telefonā un atver lietotni pēc pieskaršanās paziņojumam.
