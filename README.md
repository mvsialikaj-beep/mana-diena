# Mana diena

Personīgs dienas plānotājs ar darba un ikdienas uzdevumiem. Lietotne darbojas GitHub Pages, bet uzdevumi un fona paziņojumu abonementi glabājas Supabase projektā `szjzigtavauimamgiaoe`.

Uzdevumus un kategoriju blokus var pārvilkt aiz sešu punktu roktura ar peli vai pirkstu. Uzdevumu var pārvilkt arī uz citu kategoriju tajā pašā sadaļā. Darbi ar norādītu laiku pēc noklusējuma ir hronoloģiskā secībā, bet tos var manuāli pārkārtot. Prioritārie darbi paliek savā sadaļā virs pārējiem. Ar tastatūru fokusu uz roktura var pārvietot ar bulttaustiņiem.

Atverot uzdevumu, izvēlies **Bloka krāsa**, lai mainītu tikai tā krāsu. Kategorijas bloka krāsu var izvēlēties tās **⋯ iestatījumos** vai kategoriju pārvaldē. **Parastā krāsa** atjauno sākotnējo izskatu. Krāsas glabājas kopā ar uzdevumiem un kategoriju secību, tāpēc pierakstītam lietotājam tās sinhronizējas starp ierīcēm.

## Fona paziņojumi telefonā

1. Atver lietotni telefonā un pieraksties ar to pašu kontu, ar kuru sinhronizē uzdevumus.
2. Sadaļā **Iestatījumi un datu kopija** spied **Ieslēgt fona paziņojumus** un atļauj paziņojumus.
3. iPhone telefonā vispirms pievieno lietotni sākuma ekrānam un atver to no turienes.

Pēc ieslēgšanas spied **Nosūtīt testa paziņojumu**. Ja aplikācija ziņo, ka paziņojums nosūtīts, bet tas neparādās, iPhone sadaļā **Iestatījumi > Paziņojumi > Mana diena** pārbaudi atļaujas, kā arī Focus režīmu. Pārbaudes poga sūta paziņojumu tieši uz ierīci, kurā tā nospiesta.

Lai pārbaudītu aizvērtu aplikāciju, spied **Tests pēc 30 sekundēm** un uzreiz aizver aplikāciju. Serveris nosūtīs paziņojumu pēc 30 sekundēm, nepaļaujoties uz atvērtu lapu.

Uzdevumam var ieslēgt atgādinājumu tā dienā no plkst. 09:00. Uzdevumiem ar norādītu laiku atgādinājums 15 minūtes pirms sākuma darbojas automātiski. Servera plānotājs pārbauda atgādinājumus katru minūti, tāpēc lietotnei nav jābūt atvērtai.

## Uzturēšana

- `supabase/functions/send-reminders/` satur servera nosūtīšanu un laika aprēķinus.
- `supabase/functions/test-push/` autentificē lietotāju un sūta testa paziņojumu tikai uz viņa norādīto ierīci.
- `supabase/migrations/` satur paziņojumu tabulas un minūtes plānotāju.
- VAPID privātā atslēga un plānotāja piekļuves tokens glabājas Supabase Vault. Tos nedrīkst ievietot šajā repozitorijā.
- `sw.js` saņem push ziņojumus telefonā un atver lietotni pēc pieskaršanās paziņojumam.
