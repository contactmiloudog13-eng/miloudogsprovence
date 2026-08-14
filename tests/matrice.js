/* Balaie SYSTEMATIQUEMENT le tableau des combinaisons du formulaire de
 * reservation, au lieu d'en tester quelques-unes a la main.
 *
 * Pour chaque combinaison (nombre de chiens x autres animaux x service) :
 *   1. on remplit tout ce que le formulaire affiche comme requis ;
 *   2. on verifie que l'etape 2 est acceptee ;
 *   3. on verifie que le prix est un nombre coherent (ni 0, ni NaN) ;
 *   4. on verifie que les champs transmis a l'admin sont remplis ;
 *   5. on note toute erreur JavaScript survenue en chemin.
 */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8899/reservation.html';
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

const CHIENS = [0, 1, 2, 3];
const AUTRES = [
  { nom: 'aucun', esp: {} },
  { nom: '1 chat', esp: { chat: 1 } },
  { nom: '3 chats', esp: { chat: 3 } },
  { nom: 'chat+lapin+poules', esp: { chat: 1, lapin: 1, poules: 2 } },
];
const SERVICES = ['pension', 'garderie-jour', 'garderie-demi', 'test24', 'promenade', 'toilettage', 'visite'];

const echecs = [];
const nonProposes = [];
let total = 0, ok = 0, ignores = 0;

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, isMobile: true });
  await ctx.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.firebase=undefined;' }));
  const p = await ctx.newPage();

  const erreursJs = [];
  p.on('pageerror', e => erreursJs.push(e.message));

  for (const nc of CHIENS) {
    for (const au of AUTRES) {
      for (const sv of SERVICES) {
        total++;
        const nomCas = `${nc} chien(s) · ${au.nom} · ${sv}`;
        erreursJs.length = 0;

        // goStep(1->2) affiche une fois par session la fenetre « creez un
        // compte » et bloque le passage tant qu'elle est ouverte. C'est le
        // comportement voulu ; on le neutralise pour tester le formulaire.
        await p.addInitScript(() => { try { sessionStorage.setItem('mdp_acct', '1'); } catch (e) {} });
        await p.goto(BASE, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(500);

        const r = await p.evaluate(async ([nc, esp, sv]) => {
          const dort = ms => new Promise(r => setTimeout(r, ms));
          // Etape 1
          document.getElementById('prenom').value = 'Test';
          document.getElementById('tel').value = '0600000000';
          document.getElementById('chien').value = 'Rex';
          goStep(2);
          await dort(120);

          // Animaux
          setNbChiens(nc);
          for (const k in esp) {
            toggleAnimal(k, true);   // le 2e argument est obligatoire : sans lui, l'animal est RETIRE
            for (let i = 1; i < esp[k]; i++) bumpAnimal(k, +1);
          }
          await dort(150);

          // Service demande
          const tag = [...document.querySelectorAll('.service-tag')].find(t => t.dataset.kind === sv);
          if (!tag) return { ignore: 'service absent du formulaire' };
          const dejaActif = tag.classList.contains('active');
          const visible = tag.offsetParent !== null;
          if (!visible && !dejaActif) {
            // Sans chien, le bloc « quel service » est masque et la visite est
            // activee d'office : les services reserves au chien ne sont alors
            // pas applicables, ce qui est voulu.
            return { ignore: nc === 0 ? 'sans objet sans chien (voulu)' : 'MASQUÉ SANS RAISON' };
          }
          if (!dejaActif) toggleTag(tag);
          await dort(200);

          const actifs = [...document.querySelectorAll('.service-tag.active')].map(t => t.dataset.kind);
          if (!actifs.includes(sv)) return { ignore: 'service refusé pour cette combinaison' };

          // On remplit tout ce qui est affiché
          const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null; };
          const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };

          if (vis('date-debut')) set('date-debut', '2026-09-15');
          if (vis('date-fin')) set('date-fin', '2026-09-20');
          if (vis('heure-debut-h')) { set('heure-debut-h', '09'); set('heure-debut-m', '00'); }
          if (vis('heure-fin-h')) { set('heure-fin-h', '10'); set('heure-fin-m', '00'); }

          // Test 24 h obligatoire pour un nouveau client : on declare qu'il est fait
          const dj = document.getElementById('test-deja');
          if (dj && dj.offsetParent !== null) { dj.checked = true; testDejaFait(true); }

          // Visite a domicile, si elle est active
          if (window.__visite && window.__visite.active) {
            set('visite-start', '2026-09-15');
            set('visite-end', '2026-09-20');
            set('visite-addr', '340 chemin de la Cacholle 13140 Miramas');
            window.__visite.km = 0; window.__visite.city = 'Miramas';
            window.__visite.travelPerDay = 0; window.__visite.travelTotal = 0;
          }
          await dort(120);
          if (typeof calcPrice === 'function') calcPrice();
          await dort(200);

          const valide = _validateStep2();
          const msg = (document.getElementById('error-msg').textContent || '').trim();
          const txtTotal = (document.getElementById('price-total') || {}).innerText || '';
          const mt = txtTotal.match(/(\d+)\s*€/);
          const prix = mt ? parseInt(mt[1], 10) : null;

          // Champs transmis a l'admin
          // Etape 3 : conditions, attestation sante, puis controle de ce qui
          // partirait reellement vers l'admin.
          let envoi = null, msg3 = '';
          if (valide) {
            goStep(3);
            await dort(200);
            const cgv = document.getElementById('cgv-accept');
            const sante = document.getElementById('sante-accept');
            if (cgv) cgv.checked = true;
            if (sante) sante.checked = true;
            envoi = prepareSubmit();
            msg3 = (document.getElementById('error-msg').textContent || '').trim();
          }
          const hv = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
          return {
            valide, msg, prix, txtTotal: txtTotal.replace(/\s+/g, ' ').slice(0, 40),
            actifs, envoi, msg3,
            hService: hv('hidden-service'), hAnimaux: hv('hidden-animaux'), hDevis: hv('hidden-devis'),
            nan: /NaN|undefined|Infinity/.test(txtTotal),
          };
        }, [nc, au.esp, sv]);

        if (r.ignore) { ignores++; nonProposes.push(nomCas + '  (' + r.ignore + ')'); continue; }

        const pbs = [];
        if (!r.valide) pbs.push('étape 2 refusée : ' + (r.msg || 'sans message'));
        if (r.nan) pbs.push('prix illisible : ' + r.txtTotal);
        else if (r.prix == null) pbs.push('aucun total affiché');
        else if (r.prix <= 0) pbs.push('total à ' + r.prix + '€');
        if (r.valide && r.envoi !== true) pbs.push('envoi refusé à l\'étape 3 : ' + (r.msg3 || 'sans message'));
        if (r.valide && !r.hService) pbs.push('service non transmis à l\'admin');
        if (r.valide && !r.hAnimaux) pbs.push('animaux non transmis à l\'admin');
        else if (r.valide) {
          const attendu = Object.assign({ chien: nc }, au.esp);
          for (const [k, q] of Object.entries(attendu)) {
            if (q > 0 && !new RegExp('\\b' + q + ' ' + { chien:'chien',chat:'chat',lapin:'lapin',poules:'poule' }[k]).test(r.hAnimaux))
              pbs.push('animal manquant dans l\'e-mail : ' + q + ' ' + k + ' (reçu « ' + r.hAnimaux + ' »)');
          }
        }
        if (r.valide && !r.hDevis) pbs.push('devis non transmis à l\'admin');
        if (erreursJs.length) pbs.push('erreur JS : ' + erreursJs[0].slice(0, 70));

        if (pbs.length) echecs.push({ cas: nomCas, pbs, prix: r.prix, actifs: (r.actifs || []).join('+') });
        else ok++;
      }
    }
  }

  await b.close();
  console.log(`\n${total} combinaisons parcourues · ${ok} correctes · ${ignores} non proposées par le formulaire · ${echecs.length} en défaut\n`);
  if (nonProposes.length) {
    console.log('▌ Combinaisons que le formulaire ne propose pas :');
    nonProposes.forEach(c => console.log('    · ' + c));
    console.log('');
  }
  if (echecs.length) {
    // regroupe par nature du probleme
    const parPb = {};
    echecs.forEach(e => e.pbs.forEach(pb => {
      const cle = pb.split(':')[0];
      (parPb[cle] = parPb[cle] || []).push(e.cas + (pb.includes(':') ? '  [' + pb.split(':').slice(1).join(':').trim().slice(0, 60) + ']' : ''));
    }));
    for (const [cle, liste] of Object.entries(parPb)) {
      console.log(`▌ ${cle} — ${liste.length} cas`);
      liste.slice(0, 12).forEach(c => console.log('    · ' + c));
      if (liste.length > 12) console.log(`    … et ${liste.length - 12} autres`);
      console.log('');
    }
  } else {
    console.log('✅ aucune combinaison en défaut');
  }
  process.exit(echecs.length ? 1 : 0);
})();
