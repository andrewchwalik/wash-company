const owner = 'hello@wash.ooo';
const fields = {
  name: ['Your name', 100, 'name', true],
  business: ['Business name', 120, 'organization', true],
  email: ['Work email', 200, 'email', true],
  city: ['Business city or ZIP code', 100, 'address-level2', true],
  phone: ['Phone (optional)', 40, 'tel', false],
  frequency: ['How often?', 30, 'off', false],
  details: ['What needs washing?', 2000, 'off', true]
};
const frequencies = ['Weekly', 'Multiple times a week', 'One-time', 'Not sure yet'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const emailOK = s => /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(s);
const utf8 = new TextEncoder();
const base64 = text => btoa(String.fromCharCode(...utf8.encode(text)));
const css = `
:root{color-scheme:light;--ink:#102943;--blue:#146078;--sky:#0bb5ef;--wash:#e5f2fc}
*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.55 system-ui,sans-serif}
.shell{max-width:1110px;margin:auto;padding:clamp(16px,5vw,56px)}.mast{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:clamp(22px,4vw,42px)}.mast a{color:var(--ink);font-weight:750;text-underline-offset:4px}
.brand{font-size:1.12rem;display:inline-flex;gap:.6rem;align-items:center;text-decoration:none}.mark{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--blue);color:white;font-size:.9rem}
.layout{display:grid;grid-template-columns:minmax(220px,.82fr) minmax(0,1.35fr);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 70px #163d5915}
.intro{background:#14263e;color:#fff;padding:clamp(26px,4vw,50px);position:relative;overflow:hidden}.intro>*{position:relative}.intro:before{content:'';position:absolute;width:320px;aspect-ratio:1;border:1px solid #54daf879;box-shadow:0 0 0 24px #61dff018,0 0 0 52px #61dff015,0 0 0 84px #61dff010;border-radius:50%;bottom:-240px;right:-140px}
.kicker{color:#62d7fa;font-weight:800;text-transform:uppercase;letter-spacing:.15em;font-size:.72rem}.intro h1{margin:.55rem 0 1rem;font-size:clamp(2.45rem,5.2vw,4.3rem);line-height:.99;letter-spacing:-.055em}.intro p{max-width:32ch;color:#e7eef6}.intro p a{color:#fff;text-underline-offset:4px}.intro .call{margin-top:2rem;font-size:.9rem}
.panel{padding:clamp(22px,4.25vw,50px)}.panel h2{margin:0 0 .25rem;letter-spacing:-.04em;line-height:1.1;font-size:clamp(1.45rem,2.8vw,2.1rem)}.note{margin:.5rem 0 1.35rem;color:#40586d;font-size:.9rem}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 16px}.full{grid-column:1/-1}label{font-weight:700;font-size:.9rem;display:block}input,select,textarea{margin-top:5px;width:100%;min-height:46px;border:1px solid #a3b7c6;border-radius:9px;padding:10px 12px;background:#fff;color:var(--ink);font:inherit;font-weight:400}textarea{min-height:110px;resize:vertical;display:block}input[aria-invalid=true],select[aria-invalid=true],textarea[aria-invalid=true]{border-color:#a72026}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #14728f;outline-offset:3px}.intro a:focus-visible{outline-color:#62d7fa}
.error{display:block;color:#8a1620;font-weight:650;margin-top:4px;font-size:.84rem}.alert{background:#fff1f1;border-left:4px solid #a72026;border-radius:5px;margin:0 0 1.25rem;padding:10px 12px;color:#7d1720}.trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:20px;border:0;border-radius:28px;background:var(--blue);color:#fff;padding:10px 22px;font:750 1rem system-ui,sans-serif;text-decoration:none;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}button:hover:not(:disabled),.button:hover{background:#0e4e64}.small{font-size:.85rem;color:#40586d;margin-bottom:0}
@media(max-width:700px){.layout{grid-template-columns:1fr}.intro .call{margin-top:.85rem}}@media(max-width:430px){.grid{grid-template-columns:1fr}.shell{padding:14px}.mast{font-size:.85rem}.brand{font-size:1rem}.panel{padding:18px}button{width:100%}}
`;
const security = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'cache-control':'no-store', 'referrer-policy':'no-referrer', 'x-content-type-options':'nosniff',
  'x-robots-tag':'noindex, nofollow'
};

function page({values={}, errors={}, error='', sent=false, preview=false}={}) {
  const control = (k, [label,max,ac,required]) => {
    const invalid = errors[k] ? ` aria-invalid="true" aria-describedby="${k}-error"` : '';
    const attr = `id="${k}" name="${k}" autocomplete="${ac}"${invalid}${required?' required':''}`;
    const v = esc(values[k]);
    const el = k==='frequency' ? `<select ${attr}><option value="">Select a frequency</option>${frequencies.map(x=>`<option${x===values[k]?' selected':''}>${x}</option>`).join('')}</select>` :
      k==='details' ? `<textarea ${attr} maxlength="${max}" placeholder="For example: hotel sheets and bath towels, about 10 bags per week">${v}</textarea>` :
      `<input ${attr} maxlength="${max}" type="${k==='email'?'email':k==='phone'?'tel':'text'}" value="${v}">`;
    return `<label class="${k==='details'?'full':''}" for="${k}">${label}${el}${errors[k]?`<span class="error" id="${k}-error">${esc(errors[k])}</span>`:''}</label>`;
  };
  const alert = error ? `<p class="alert" role="alert">${esc(error)}</p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Request a Laundry Quote | The Wash Company</title><style>${css}</style></head><body>
<div class="shell"><div class="mast"><a class="brand" href="https://wash.ooo/"><span class="mark" aria-hidden="true">W</span> The Wash Company</a><a href="https://wash.ooo/">Back to website</a></div>
<main class="layout"><section class="intro"><p class="kicker">Commercial laundry · North-central Ohio</p><h1>Request<br>a quote.</h1><p>Hotel sheets, restaurant linens, shop towels and more. Tell us what you wash and how often.</p><p class="call">Prefer to talk? <a href="tel:+14193702993">(419) 370-2993</a></p></section>
<section class="panel" aria-label="Quote request">${sent?
 '<h2>Request sent.</h2><p>Thanks for reaching out. We’ll follow up at the email address you provided.</p><a class="button" href="https://wash.ooo/">Back to the website</a>' :
 `<h2>Tell us about your laundry</h2><p class="note">Start with what you know. You don’t need an exact count.</p>${preview?'<p class="alert">Preview only. This form isn’t accepting requests yet.</p>':''}${alert}<form action="/quote" method="post"><div class="grid">${Object.entries(fields).map(([k,f])=>control(k,f)).join('')}</div><div class="trap" aria-hidden="true"><label for="website">Leave this field empty</label><input id="website" name="website" tabindex="-1" autocomplete="off" maxlength="200"></div><button type="submit"${preview?' disabled':''}>Send quote request</button><p class="small">We’ll use these details to respond to your request.</p></form>`
}</section></main></div></body></html>`;
}
const html = (state, status=200, headers={}) => new Response(page(state), {status,headers:{...security,...headers}});
const redirect = (location, confirmed=false) => new Response(null,{status:303,headers:{location,'cache-control':'no-store',...(confirmed?{'set-cookie':'__Host-quote-confirmed=1; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=120'}:{})}});

async function readBody(req) {
  const reader = req.body?.getReader();
  if (!reader) return new URLSearchParams();
  let bytes = 0, text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 16000) { void reader.cancel().catch(()=>{}); return null; }
      text += decoder.decode(value,{stream:true});
    }
    return new URLSearchParams(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

export function handler(sendMail, { live = () => true } = {}) {
  return {async fetch(req,env) {
    const u = new URL(req.url);
    if (req.method==='GET' && u.pathname==='/') return redirect('/quote');
    if (req.method==='GET' && u.pathname==='/quote') return html({preview:!live(env)});
    if (req.method==='GET' && u.pathname==='/quote/sent') {
      if (!/(?:^|;\s*)__Host-quote-confirmed=1(?:;|$)/.test(req.headers.get('cookie')||'')) return redirect('/quote');
      return html({sent:true});
    }
    if (u.pathname!=='/quote') return new Response('Not found',{status:404});
    if (req.method!=='POST') return new Response('Method not allowed',{status:405,headers:{allow:'GET, POST'}});
    if (!live(env)) return html({preview:true},503);
    if (req.headers.get('origin')!==u.origin) return html({error:'Please open the quote page and try again.'},403);
    if (!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers.get('content-type')||'')) return html({error:'Please use the quote form to send your request.'},415);
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    if (!env.QUOTE_IP || !env.QUOTE_TOTAL) return html({error:'Online requests are temporarily unavailable. Please call (419) 370-2993.'},503);
    if (!(await env.QUOTE_IP.limit({key:ip})).success) return html({error:'Too many attempts. Please wait a minute and try again.'},429,{'retry-after':'60'});
    let form;
    try { form=await readBody(req); } catch { return html({error:'Couldn’t read the request. Please try again.'},400); }
    if (!form) return html({error:'The request is too long. Please shorten the details and try again.'},413);
    if (form.get('website')) return redirect('/quote/sent',true);
    const values = {}, errors = {};
    for (const [k,[label,max,,required]] of Object.entries(fields)) {
      const raw=(form.get(k)||'').trim();
      values[k]=raw.slice(0,max);
      if (required&&!raw) errors[k]=`Enter ${label.toLowerCase().replace(/^what needs washing\?$/,'a brief description')}.`;
      else if(raw.length>max) errors[k]=`Use ${max} characters or fewer.`;
      else if(k!=='details'&&/[\x00-\x1f\x7f]/.test(raw)) errors[k]='Please use a single line.';
    }
    if (values.email&&!errors.email&&!emailOK(values.email)) errors.email='Enter a valid email address.';
    if (values.frequency&&!frequencies.includes(values.frequency)) errors.frequency='Choose one of the listed frequencies.';
    if (Object.keys(errors).length) return html({values,errors,error:'Check the highlighted fields and try again.'},422);
    if (!(await env.QUOTE_TOTAL.limit({key:'quote'})).success) return html({values,error:'Online requests are busy. Please try again in a minute.'},429,{'retry-after':'60'});
    try {
      await sendMail(values,env);
      return redirect('/quote/sent',true);
    } catch {
      return html({values,error:'We couldn’t send your request. Please try again or call (419) 370-2993.'},503);
    }
  }};
}

export async function deliver(connect, values, env) {
  const login = env.PURELYMAIL_SMTP_USERNAME || owner;
  if (!env.PURELYMAIL_APP_PASSWORD || !emailOK(login)) throw Error('Mailer not configured');
  const socket=connect({hostname:'smtp.purelymail.com',port:465},{secureTransport:'on'});
  const reader=socket.readable.getReader(), writer=socket.writable.getWriter();
  const decoder=new TextDecoder();
  let buffer='';
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Mail timeout')),12000);});
  // Each SMTP stage is sequential. Close the socket in all outcomes.
  const read=async expected=>{
    while (true) {
      const nl=buffer.indexOf('\n');
      if (nl>=0) {
        const line=buffer.slice(0,nl).trimEnd(); buffer=buffer.slice(nl+1);
        if (!/^\d{3}[ -]/.test(line)) throw Error('Invalid mail response');
        if (line[3]==='-') continue;
        if (!expected.includes(Number(line.slice(0,3)))) throw Error('Mail response rejected');
        return;
      }
      const item=await reader.read();
      if(item.done||buffer.length>12000)throw Error('Incomplete mail response');
      buffer+=decoder.decode(item.value,{stream:true});
    }
  };
  const command=async (s, expected)=>{await writer.write(utf8.encode(s+'\r\n'));await read(expected);};
  const body=Object.entries(fields).map(([k,[label]])=>label+': '+(values[k]||'Not provided')).join('\r\n\r\n');
  const headers=[
    'From: The Wash Company Website <'+owner+'>','To: '+owner,'Reply-To: '+values.email,
    'Subject: New commercial laundry quote request','Date: '+new Date().toUTCString(),
    'Message-ID: <'+crypto.randomUUID()+'@wash.ooo>','MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'
  ];
  const encoded=base64(body).match(/.{1,76}/g).join('\r\n');
  try {
    await Promise.race([(async()=>{
      await read([220]); await command('EHLO wash.ooo',[250]);
      await command('AUTH PLAIN '+base64('\0'+login+'\0'+env.PURELYMAIL_APP_PASSWORD),[235]);
      await command('MAIL FROM:<'+owner+'>',[250]);
      await command('RCPT TO:<'+owner+'>',[250,251]);
      await command('DATA',[354]);
      await command(headers.join('\r\n')+'\r\n\r\n'+encoded+'\r\n.',[250]);
    })(),timeout]);
  } finally { clearTimeout(timer); void socket.close().catch(()=>{}); }
}
