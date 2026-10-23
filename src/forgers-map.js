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
    host.innerHTML=`<div class="board-head"><div><h1>Forgers’ Map</h1><p>Meet the community across Canada. Every pin is optional and member-chosen.</p></div></div><div class="map-controls"><button class="btn" id="map-edit">${own?'Edit my pin':'Put myself on the map'}</button><button class="btn secondary" id="map-canada">Show Canada</button><span>${pins.length} <span>members on the map</span></span></div><p class="muted">You choose the pin yourself. The portal does not detect your location. Coordinates are rounded to two decimal places before storage and sharing. Members see an approximate area with your name, label and flags. Use a city or region label, never your street address.</p><div class="map-layout"><div id="forgers-map" aria-label="Community map of Canada"></div><div id="map-side"><div id="map-editor"></div><div id="map-person" aria-live="polite"></div><h2>On the map</h2><div id="map-members"></div></div></div><p class="map-provider-note">Map tiles: OpenStreetMap. Your browser loads map images from OpenStreetMap; member names and pins are rendered by this portal.</p><p id="map-error" role="alert"></p>`;
    const error=message=>{const el=document.getElementById('map-error');if(el)el.textContent=message;};
    const memberList=document.getElementById('map-members');
    const detail=p=>{document.getElementById('map-person').innerHTML=`${badge(p.flags)}<h3>${esc(p.name)}</h3><p class="shared-text">${esc(p.label)}</p><p>${esc(p.flags.map(flagName).join(' · '))}</p>`;};
    pins.forEach(p=>{const b=document.createElement('button');b.className='map-member';b.innerHTML=badge(p.flags)+`<span><strong>${esc(p.name)}</strong><span class="shared-text">${esc(p.label)}</span></span>`;b.onclick=()=>{map?.setView([p.lat,p.lng],8);detail(p);};memberList.append(b);});
    if(!pins.length)memberList.textContent='No shared pins yet. You can be the first.';
    if(!M.account)memberList.textContent='Sign in with Discord to view member pins or add your own.';
    let draftMarker;
    function place(lat,lng){draft.lat=Number(lat.toFixed(2));draft.lng=Number(lng.toFixed(2));lat=draft.lat;lng=draft.lng;if(draftMarker)draftMarker.setLatLng([lat,lng]);else if(map)draftMarker=L.circleMarker([lat,lng],{radius:12,color:'#c34a20',fillOpacity:.45}).addTo(map);document.getElementById('map-position').textContent=`${draft.lat}, ${draft.lng}`;}
    function edit(){
      if(!M.requireAccount())return;
      editing=true;draft=draft||{lat:own?.lat??null,lng:own?.lng??null,label:own?.label||'',flags:[...(own?.flags||[])]};
      const editor=document.getElementById('map-editor');
      editor.innerHTML=`<h2>My pin</h2><p>Click to choose the spot you want to share. The server rounds coordinates to two decimal places, an approximate area rather than a precise address. It does not need to be your home or current location.</p><label>Jump to a province<select id="map-province"><option value="">Choose a province or territory</option>${Object.entries(provinces).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label>Location label<input id="map-label" maxlength="100" placeholder="City or province, not a street address" value="${esc(draft.label)}"></label><p id="map-position">${draft.lat===null?'No position selected':`${draft.lat}, ${draft.lng}`}</p><label>Optional flags (up to 3)<select id="map-flag"><option value="">Add a flag</option><optgroup label="Canada, provinces and territories">${['CA',...Object.keys(provinces).map(k=>'CA-'+k)].map(f=>`<option value="${f}">${esc(flagName(f))}</option>`).join('')}</optgroup><optgroup label="Countries">${countries.filter(c=>c!=='CA').map(f=>`<option value="${f}">${esc(flagName(f))}</option>`).join('')}</optgroup></select></label><div id="map-flags"></div><p>Flags are optional. Multiple choices form one combined badge.</p><label class="map-consent"><input type="checkbox" id="map-consent">I understand that members can see this approximate selected area with my name, label and flags. I chose it myself and want to share it.</label><div class="map-controls"><button class="btn" id="map-save">Save my pin</button><button class="btn secondary" id="map-cancel">Cancel</button>${own?'<button class="btn secondary" id="map-remove">Remove my pin</button>':''}</div>`;
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
      map=L.map('forgers-map',{minZoom:2,maxZoom:11}).fitBounds([[42,-141],[72,-52]]);
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:11,referrerPolicy:'strict-origin-when-cross-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
      const pinLayer=L.layerGroup().addTo(map);
      function drawPins(){
        pinLayer.clearLayers();
        // Group intersecting label footprints in screen space, including identical locations.
        const groups=[];
        for(const p of pins){
          const xy=map.latLngToLayerPoint([p.lat,p.lng]);
          const width=Math.min(110,Math.max(32,p.name.length*8))+p.flags.length*24+14;
          let group={pins:[p],left:xy.x,right:xy.x+width,top:xy.y-12,bottom:xy.y+12};
          for(let i=groups.length-1;i>=0;i--){const g=groups[i];if(group.left<g.right+8&&group.right+8>g.left&&group.top<g.bottom+6&&group.bottom+6>g.top){group={pins:group.pins.concat(g.pins),left:Math.min(group.left,g.left),right:Math.max(group.right,g.right),top:Math.min(group.top,g.top),bottom:Math.max(group.bottom,g.bottom)};groups.splice(i,1);i=groups.length;}}
          groups.push(group);
        }
        for(const g of groups){
          const p=g.pins[0];
          if(g.pins.length===1){
            const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'forge-map-marker',html:`<span class="map-pin-label"><strong>${esc(p.name)}</strong>${p.flags.length?badge(p.flags):''}</span>`,iconSize:[0,0],iconAnchor:[0,0]}),title:p.name+' · '+p.label,alt:p.name+' · '+p.label}).addTo(pinLayer);
            marker.bindTooltip(esc(p.name)+' · '+esc(p.label));marker.on('click',()=>detail(p));
          }else{
            const centre=[g.pins.reduce((n,p)=>n+p.lat,0)/g.pins.length,g.pins.reduce((n,p)=>n+p.lng,0)/g.pins.length];
            const marker=L.marker(centre,{icon:L.divIcon({className:'forge-map-cluster',html:`<span>${g.pins.length}</span>`,iconSize:[30,30],iconAnchor:[15,15]}),title:g.pins.length+' '+(document.documentElement.lang==='fr'?'membres':'members')}).addTo(pinLayer);
            marker.bindTooltip(g.pins.length+' '+(document.documentElement.lang==='fr'?'membres':'members'));
            marker.on('click',()=>{
              const box=document.getElementById('map-person');box.replaceChildren();
              g.pins.forEach(p=>{const b=document.createElement('button');b.className='map-member';b.innerHTML=`<strong>${esc(p.name)}</strong>${badge(p.flags)}`;b.onclick=()=>detail(p);box.append(b);});
              if(map.getZoom()<11)map.setView(centre,Math.min(11,map.getZoom()+2));
            });
          }
        }
      }
      drawPins();map.on('zoomend moveend',drawPins);
      map.on('click',e=>{if(editing)place(e.latlng.lat,e.latlng.lng);});
      if(editing)edit();
    }catch(err){error(err.message);}
  }
  const before=render;render=function(){before();if(view==='map')renderMap();else{generation++;if(map){map.remove();map=null;}editing=false;draft=null;}};
}

if(requestedPortalSection==='map'){portalTravel=true;try{switchSection('map');}finally{portalTravel=false;}portalTrail.length=0;portalTrailIndex=-1;drawSectionTabs();}
