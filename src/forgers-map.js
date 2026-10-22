// Opt-in locations belong to the authenticated account. No geolocation is requested.
if (window.MF) {
  const M=window.MF;
  sectionLabels.map="Forgers’ Map";
  const link=document.createElement('button');link.dataset.view='map';link.textContent='Forgers’ Map';link.onclick=()=>switchSection('map');document.querySelector('.nav').append(link);
  const provinces={AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland and Labrador',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',ON:'Ontario',PE:'Prince Edward Island',QC:'Québec',SK:'Saskatchewan',YT:'Yukon'};
  const centres={AB:[54,-115],BC:[54,-125],MB:[55,-98],NB:[46.5,-66.5],NL:[53,-59],NS:[45,-63],NT:[65,-120],NU:[68,-95],ON:[50,-85],PE:[46.4,-63.2],QC:[53,-71],SK:[54,-106],YT:[64,-136]};
  const countries='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  const flagName=f=>f.startsWith('CA-')?provinces[f.slice(3)]:new Intl.DisplayNames([document.documentElement.lang||'en'],{type:'region'}).of(f);
  const flagPiece=f=>`<img src="/flags/${esc(f)}.svg" alt="${esc(flagName(f))}">`;
  const badge=flags=>flags.length?`<span class="map-flag-badge" aria-label="${esc(flags.map(flagName).join(', '))}">${flags.map(flagPiece).join('')}</span>`:'<span class="map-plain-pin" aria-hidden="true">●</span>';
  let library, map, generation=0, editing=false, draft=null;
  M.mapIsEditing=()=>editing;
  function loadMap(){
    if(window.L)return Promise.resolve();
    if(library)return library;
    library=new Promise((resolve,reject)=>{
      const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet/leaflet.css';document.head.append(css);
      const script=document.createElement('script');script.src='/vendor/leaflet/leaflet.js';script.onload=resolve;script.onerror=()=>{library=null;reject(new Error('Map library could not load. Refresh to retry.'));};document.head.append(script);
    });return library;
  }
  async function renderMap(){
    const token=++generation;
    if(map){map.remove();map=null;}
    const pins=M.bookmarkData?.mapPins||[];
    const own=pins.find(p=>p.uid===M.account?.id);
    const host=document.getElementById('main');
    host.innerHTML=`<div class="board-head"><div><h1>Forgers’ Map</h1><p>Meet the community across Canada. Every pin is optional and member-chosen.</p></div></div><div class="map-controls"><button class="btn" id="map-edit">${own?'Edit my pin':'Put myself on the map'}</button><button class="btn secondary" id="map-canada">Show Canada</button><span>${pins.length} <span>members on the map</span></span></div><p class="muted">Choose a province, city or approximate spot. Pins show where people choose to be shown, not a verified address. Visible to signed-in members.</p><div class="map-layout"><div id="forgers-map" aria-label="Community map of Canada"></div><div id="map-side"><div id="map-editor"></div><div id="map-person" aria-live="polite"></div><h2>On the map</h2><div id="map-members"></div></div></div><p class="map-provider-note">Map tiles: OpenStreetMap. Your browser loads map images from OpenStreetMap; member names and pins are rendered by this portal.</p><p id="map-error" role="alert"></p>`;
    const error=message=>{const el=document.getElementById('map-error');if(el)el.textContent=message;};
    const memberList=document.getElementById('map-members');
    const detail=p=>{document.getElementById('map-person').innerHTML=`${badge(p.flags)}<h3>${esc(p.name)}</h3><p class="shared-text">${esc(p.label)}</p><p>${esc(p.flags.map(flagName).join(' · '))}</p>`;};
    pins.forEach(p=>{const b=document.createElement('button');b.className='map-member';b.innerHTML=badge(p.flags)+`<span><strong>${esc(p.name)}</strong><span class="shared-text">${esc(p.label)}</span></span>`;b.onclick=()=>{map?.setView([p.lat,p.lng],8);detail(p);};memberList.append(b);});
    if(!pins.length)memberList.textContent='No shared pins yet. You can be the first.';
    if(!M.account)memberList.textContent='Sign in with Discord to view member pins or add your own.';
    let draftMarker;
    function place(lat,lng){draft.lat=Number(lat.toFixed(5));draft.lng=Number(lng.toFixed(5));if(draftMarker)draftMarker.setLatLng([lat,lng]);else if(map)draftMarker=L.circleMarker([lat,lng],{radius:12,color:'#c34a20',fillOpacity:.45}).addTo(map);document.getElementById('map-position').textContent=`${draft.lat}, ${draft.lng}`;}
    function edit(){
      if(!M.requireAccount())return;
      editing=true;draft=draft||{lat:own?.lat??null,lng:own?.lng??null,label:own?.label||'',flags:[...(own?.flags||[])]};
      const editor=document.getElementById('map-editor');
      editor.innerHTML=`<h2>My pin</h2><p>Zoom in and click the map to choose a spot. A province or city centre is fine.</p><label>Jump to a province<select id="map-province"><option value="">Choose a province or territory</option>${Object.entries(provinces).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label>Location label<input id="map-label" maxlength="100" placeholder="City, province or postal-code area" value="${esc(draft.label)}"></label><p id="map-position">${draft.lat===null?'No position selected':`${draft.lat}, ${draft.lng}`}</p><label>Optional flags (up to 3)<select id="map-flag"><option value="">Add a flag</option><optgroup label="Canada, provinces and territories">${['CA',...Object.keys(provinces).map(k=>'CA-'+k)].map(f=>`<option value="${f}">${esc(flagName(f))}</option>`).join('')}</optgroup><optgroup label="Countries">${countries.filter(c=>c!=='CA').map(f=>`<option value="${f}">${esc(flagName(f))}</option>`).join('')}</optgroup></select></label><div id="map-flags"></div><p>Flags are optional. Multiple choices form one combined badge.</p><label class="map-consent"><input type="checkbox" id="map-consent">Share this name, location label, pin and optional flags with signed-in members.</label><div class="map-controls"><button class="btn" id="map-save">Save my pin</button><button class="btn secondary" id="map-cancel">Cancel</button>${own?'<button class="btn secondary" id="map-remove">Remove my pin</button>':''}</div>`;
      function flags(){const el=document.getElementById('map-flags');el.innerHTML=badge(draft.flags);draft.flags.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.className='btn link';b.textContent=flagName(f)+' ×';b.setAttribute('aria-label','Remove '+flagName(f));b.onclick=()=>{draft.flags.splice(i,1);flags();};el.append(b);});}
      flags();
      document.getElementById('map-label').oninput=e=>draft.label=e.target.value;
      document.getElementById('map-flag').onchange=e=>{if(e.target.value&&!draft.flags.includes(e.target.value)){if(draft.flags.length===3){error('Choose up to three flags. Remove one before adding another.');}else draft.flags.push(e.target.value);}e.target.value='';flags();};
      document.getElementById('map-province').onchange=e=>{const p=centres[e.target.value];if(p){map?.setView(p,5);place(...p);if(!draft.label){draft.label=provinces[e.target.value];document.getElementById('map-label').value=draft.label;}}};
      document.getElementById('map-cancel').onclick=()=>{editing=false;draft=null;renderMap();};
      document.getElementById('map-save').onclick=async e=>{if(draft.lat===null||!draft.label.trim()){error('Choose a map position and enter a location label.');return;}if(!document.getElementById('map-consent').checked){error('Check the sharing option before saving your pin.');return;}e.target.disabled=true;try{await M.api('/api/shared',{op:'map_pin',...draft,consent:true});editing=false;draft=null;await M.hydrate();renderMap();}catch(err){error(err.message);e.target.disabled=false;}};
      if(own)document.getElementById('map-remove').onclick=async e=>{e.target.disabled=true;try{await M.api('/api/shared',{op:'map_pin',remove:true});editing=false;draft=null;await M.hydrate();renderMap();}catch(err){error(err.message);e.target.disabled=false;}};
      if(draft.lat!==null)place(draft.lat,draft.lng);
    }
    document.getElementById('map-edit').onclick=edit;
    document.getElementById('map-canada').onclick=()=>map?.fitBounds([[42,-141],[72,-52]]);
    try{await loadMap();if(token!==generation||view!=='map'||!document.getElementById('forgers-map'))return;
      map=L.map('forgers-map',{minZoom:2,maxZoom:17}).fitBounds([[42,-141],[72,-52]]);
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
      pins.forEach(p=>{const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'forge-map-marker',html:`<span class="map-pin-label"><strong>${esc(p.name)}</strong>${p.flags.length?badge(p.flags):''}</span>`,iconSize:[0,0],iconAnchor:[0,0]}),title:p.name+' · '+p.label,alt:p.name+' · '+p.label}).addTo(map);marker.bindTooltip(esc(p.name)+' · '+esc(p.label));marker.on('click',()=>detail(p));});
      map.on('click',e=>{if(editing)place(e.latlng.lat,e.latlng.lng);});
      if(editing)edit();
    }catch(err){error(err.message);}
  }
  const before=render;render=function(){before();if(view==='map')renderMap();else{generation++;if(map){map.remove();map=null;}editing=false;draft=null;}};
}

if(requestedPortalSection==='map'){portalTravel=true;try{switchSection('map');}finally{portalTravel=false;}portalTrail.length=0;portalTrailIndex=-1;drawSectionTabs();}
