(function(){
  document.documentElement.setAttribute("data-geovisor-version","3.1");
  const DATA = window.GRM_DATA || {};
  const PUB = window.GRM_AMIANTO_PUBLICO || [];
  const PRIV_AGG = window.GRM_AMIANTO_PRIVADO_AGG || [];
  const LITTER = window.GRM_LITTERING || [];
  const META = window.GRM_V3_META || {};
  const mapEl = document.getElementById('grm-map');
  if (!mapEl || typeof L === 'undefined') return;

  const canvasRenderer = L.canvas({padding:0.5});
  const map = L.map(mapEl, {zoomControl:false, preferCanvas:true, minZoom:7, maxZoom:19});
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);

  const esc = v => (v===null || v===undefined || v==='') ? '' : String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  function row(label,value){ if(value===null||value===undefined||String(value).trim()==='') return ''; return '<div class="grm-popup-row"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'; }
  function popupTitle(props,keys,fallback){ for(const k of keys) if(props[k]) return esc(props[k]); return esc(fallback||'Elemento'); }
  function fmt(n){ return new Intl.NumberFormat('es-ES').format(n||0); }
  function muniKey(s){
    let k=(s||'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/-/g,' ').replace(/\s+/g,' ');
    if(k==='fuente alamo de murcia'||k==='fuente alamo') k='fuente alamo';
    if(k==='las torres de cotillas'||k==='torres de cotillas') k='torres de cotillas';
    return k;
  }

  const styles={
    municipios:{color:'#8b8f86',weight:1,fillColor:'#f1efe8',fillOpacity:.12},
    ecoparques:{color:'#2f7d32',fillColor:'#2f7d32'}, transferencia:{color:'#7b5b45',fillColor:'#7b5b45'},
    envases:{color:'#1f9d3a',fillColor:'#1f9d3a'}, rsu:{color:'#b1193f',fillColor:'#b1193f'},
    vert_inertes:{color:'#2b6ea6',fillColor:'#2b6ea6'}, vert_no_peligrosos:{color:'#123e67',fillColor:'#123e67'},
    desguaces:{color:'#dc6d22',fillColor:'#dc6d22'}, instalaciones_general:{color:'#7b4fa3',fillColor:'#7b4fa3'}, littering:{color:'#8e5a2b',fillColor:'#8e5a2b'}
  };
  function markerStyle(key){ const s=styles[key]||{color:'#555',fillColor:'#555'}; return {renderer:canvasRenderer,radius:6,color:'#fff',weight:1.5,fillColor:s.fillColor,fillOpacity:.95}; }

  const layers={}; const featureCounts={};
  layers.municipios=L.geoJSON(DATA.municipios,{
    style:()=>styles.municipios,
    onEachFeature:(feature,layer)=>layer.bindTooltip(feature.properties.NombreMuni||'',{sticky:true,direction:'top'})
  }).addTo(map);
  featureCounts.municipios=DATA.municipios?.features?.length||0;

  const municipalityCenters={};
  layers.municipios.eachLayer(l=>{
    const name=l.feature?.properties?.NombreMuni||'';
    if(name && l.getBounds) municipalityCenters[muniKey(name)] = l.getBounds().getCenter();
  });

  function buildPointLayer(key,geojson,popupBuilder){
    const layer=L.geoJSON(geojson,{
      pointToLayer:(feature,latlng)=>L.circleMarker(latlng,markerStyle(key)),
      onEachFeature:(feature,lyr)=>{
        const p=feature.properties||{}; lyr.bindPopup(popupBuilder(p),{maxWidth:360});
        const t=p.Name||p.NOMBRE_DEL||p['Razón_Soc']||p.Nombre||''; if(t) lyr.bindTooltip(t,{sticky:true});
      }
    });
    featureCounts[key]=geojson?.features?.length||0; return layer;
  }

  layers.ecoparques=buildPointLayer('ecoparques',DATA.ecoparques,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Ecoparque')+'</h4>'+row('Municipio',p.Municipio)+'</div>');
  layers.transferencia=buildPointLayer('transferencia',DATA.transferencia,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Estación de transferencia')+'</h4></div>');
  layers.envases=buildPointLayer('envases',DATA.envases,p=>'<div class="grm-popup"><h4>Planta de clasificación de envases</h4>'+row('Centro',p.NOMBRE_DEL)+row('Titular',p.TITULAR)+row('Titularidad',p.TITULARIDA)+row('Dirección',p['DIRECCIÓN'])+'</div>');
  layers.rsu=buildPointLayer('rsu',DATA.rsu,p=>'<div class="grm-popup"><h4>Planta de tratamiento de residuos municipales</h4>'+row('Centro',p.NOMBRE_DEL)+row('Titular',p.TITULAR)+row('Titularidad',p.TITULARIDA)+row('Dirección',p['DIRECCIÓN'])+'</div>');
  layers.vert_inertes=buildPointLayer('vert_inertes',DATA.vert_inertes,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Razón_Soc'],'Vertedero de residuos inertes')+'</h4>'+row('Tipo',p.Tipo_de_ve)+row('Municipio',p['Población'])+row('Dirección',p.Direcci_1)+'</div>');
  layers.vert_no_peligrosos=buildPointLayer('vert_no_peligrosos',DATA.vert_no_peligrosos,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Razón_Soc'],'Vertedero de residuos no peligrosos')+'</h4>'+row('Tipo',p.Tipo_de_ve)+row('Municipio',p['Población'])+row('Dirección',p['Dirección'])+'</div>');
  layers.desguaces=buildPointLayer('desguaces',DATA.desguaces,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Centro autorizado')+'</h4>'+row('Municipio',p.NombreMuni)+row('Comarca',p.Comarca)+'</div>');
  layers.instalaciones_general=buildPointLayer('instalaciones_general',DATA.instalaciones_general,p=>'<div class="grm-popup"><h4>'+popupTitle(p,['Nombre'],'Instalación')+'</h4>'+row('Tipos de instalación',p.Tipos)+row('Operaciones',p.Operaciones)+row('Gestión',p.Gestion)+row('Dirección',p.Direccion)+'</div>');

  layers.littering=L.layerGroup();
  LITTER.forEach(r=>{
    const m=L.circleMarker([r.lat,r.lng],markerStyle('littering'));
    m.bindPopup('<div class="grm-popup"><h4>Punto de littering</h4>'+row('Municipio',r.muni)+row('Fecha',r.date)+row('Descripción',r.desc)+row('Observaciones',r.remarks)+'</div>',{maxWidth:360});
    if(r.muni) m.bindTooltip('Littering · '+r.muni,{sticky:true});
    m.addTo(layers.littering);
  });
  featureCounts.littering=LITTER.length;

  layers.amianto_publico=L.layerGroup();
  layers.amianto_privado=L.layerGroup();
  const amiantoColors={confirmada:'#c62828',sospecha:'#f39c12',no:'#708090',sin_dato:'#aaaaaa'};
  const statusLabels={confirmada:'Confirmada',sospecha:'Sospecha / dudosa',no:'No detectada',sin_dato:'Sin dato'};
  const amiantoFilteredPublic=[];
  let publicFiltered=[];
  let publicAggregates=[];
  let privateAggregates=[];
  const amiantoState={amianto_publico:{selected:0,drawn:0,mode:''},amianto_privado:{selected:0,drawn:0,mode:''}};

  function activeStatuses(){ return new Set(Array.from(document.querySelectorAll('.grm-asb-status:checked')).map(x=>x.value)); }
  function selectedPriority(){ return document.getElementById('grm-priority-filter')?.value||''; }
  function matchesAmianto(r,statuses,priority){ return statuses.has(r.status) && (!priority || r.priority===priority); }

  function aggregateRawRecords(records){
    const buckets={};
    records.forEach(r=>{
      const mk=muniKey(r.muni)||'_sin_municipio';
      if(!buckets[mk]) buckets[mk]={muni:r.muni||'Sin municipio',count:0,latSum:0,lngSum:0,status:{confirmada:0,sospecha:0,no:0,sin_dato:0}};
      const b=buckets[mk]; b.count++; b.latSum+=r.lat; b.lngSum+=r.lng; b.status[r.status]=(b.status[r.status]||0)+1;
    });
    return Object.values(buckets).map(b=>({muni:b.muni,count:b.count,status:b.status,center:municipalityCenters[muniKey(b.muni)]||L.latLng(b.latSum/b.count,b.lngSum/b.count)}));
  }

  function rebuildAmiantoFilterCache(){
    const statuses=activeStatuses(), priority=selectedPriority();
    publicFiltered=PUB.filter(r=>matchesAmianto(r,statuses,priority));
    publicAggregates=aggregateRawRecords(publicFiltered);
    amiantoState.amianto_publico.selected=publicFiltered.length;

    const pb={}; let privateTotal=0;
    PRIV_AGG.forEach(r=>{
      if(!matchesAmianto(r,statuses,priority)) return;
      const mk=muniKey(r.muni)||'_sin_municipio';
      if(!pb[mk]) pb[mk]={muni:r.muni||'Sin municipio',count:0,status:{confirmada:0,sospecha:0,no:0,sin_dato:0},center:municipalityCenters[muniKey(r.muni)]||L.latLng(r.lat,r.lng)};
      pb[mk].count+=r.count; pb[mk].status[r.status]=(pb[mk].status[r.status]||0)+r.count; privateTotal+=r.count;
    });
    privateAggregates=Object.values(pb);
    amiantoState.amianto_privado.selected=privateTotal;
  }

  function amountText(r){ return [r.asb_qty,r.meas_uom].filter(Boolean).join(' '); }
  function popupPublic(r){
    return '<div class="grm-popup"><h4>'+esc(r.name||'Edificación pública')+'</h4>'+row('Municipio',r.muni)+row('Titularidad',r.ownership)+row('Uso principal',r.main_use)+row('Uso catastral',r.use_type)+row('Presencia',statusLabels[r.status])+row('Tipo de elemento',r.asb_type)+row('Conservación',r.asb_cond)+row('Accesibilidad',r.asb_acc)+row('Cantidad',amountText(r))+row('Prioridad',r.priority)+row('Fecha inspección',r.insp_date)+'</div>';
  }
  function aggregatePopup(a,key){
    const kind=key==='amianto_publico'?'edificaciones públicas':'edificaciones privadas';
    const extra=key==='amianto_privado'?'<div class="grm-popup-note">En esta demo pública las localizaciones privadas se muestran únicamente agregadas por municipio.</div>':'<div class="grm-popup-note">Amplíe el mapa para consultar los registros públicos individuales.</div>';
    return '<div class="grm-popup"><h4>'+esc(a.muni)+'</h4>'+row('Registros seleccionados',fmt(a.count))+row('Confirmada',fmt(a.status.confirmada))+row('Sospecha / dudosa',fmt(a.status.sospecha))+row('No detectada',fmt(a.status.no))+row('Sin dato',fmt(a.status.sin_dato))+extra+'</div>';
  }

  function addAggregateMarkers(group,aggs,key){
    aggs.forEach(a=>{
      const radius=Math.max(28,Math.min(48,24+Math.sqrt(a.count)*1.15));
      const cls=key==='amianto_publico'?'grm-cluster-public':'grm-cluster-private';
      const icon=L.divIcon({className:'',html:'<div class="grm-cluster-marker '+cls+'" style="width:'+radius+'px;height:'+radius+'px">'+fmt(a.count)+'</div>',iconSize:[radius,radius],iconAnchor:[radius/2,radius/2]});
      const m=L.marker(a.center,{icon}); m.bindPopup(aggregatePopup(a,key),{maxWidth:335}); m.bindTooltip(a.muni+' · '+fmt(a.count),{sticky:true}); m.addTo(group);
    });
  }

  function renderAmiantoPublico(){
    const key='amianto_publico',group=layers[key]; group.clearLayers();
    const input=document.querySelector('.grm-layer-toggle[data-layer="'+key+'"]');
    if(!input?.checked || !map.hasLayer(group)){ amiantoState[key].drawn=0; amiantoState[key].mode=''; return; }
    if(map.getZoom()<11){
      addAggregateMarkers(group,publicAggregates,key); amiantoState[key].drawn=publicAggregates.length; amiantoState[key].mode='agregada por municipio';
    }else{
      const bounds=map.getBounds().pad(.08); let drawn=0;
      publicFiltered.forEach(r=>{
        const ll=L.latLng(r.lat,r.lng); if(!bounds.contains(ll)) return;
        const m=L.circleMarker(ll,{renderer:canvasRenderer,radius:5,color:'#fff',weight:1,fillColor:amiantoColors[r.status]||'#aaa',fillOpacity:.9});
        m.bindPopup(popupPublic(r),{maxWidth:365}); m.bindTooltip('Pública · '+statusLabels[r.status],{sticky:true}); m.addTo(group); drawn++;
      });
      amiantoState[key].drawn=drawn; amiantoState[key].mode='detalle individual en el área visible';
    }
  }

  function renderAmiantoPrivado(){
    const key='amianto_privado',group=layers[key]; group.clearLayers();
    const input=document.querySelector('.grm-layer-toggle[data-layer="'+key+'"]');
    if(!input?.checked || !map.hasLayer(group)){ amiantoState[key].drawn=0; amiantoState[key].mode=''; return; }
    addAggregateMarkers(group,privateAggregates,key);
    amiantoState[key].drawn=privateAggregates.length; amiantoState[key].mode='agregada por municipio en la demo pública';
  }

  function updateAmiantoMode(){
    const el=document.getElementById('grm-amianto-mode'); if(!el) return;
    const active=[];
    [['amianto_publico','Públicas'],['amianto_privado','Privadas']].forEach(([k,label])=>{
      const inp=document.querySelector('.grm-layer-toggle[data-layer="'+k+'"]');
      if(inp?.checked) active.push(label+': '+fmt(amiantoState[k].selected)+' seleccionadas; '+amiantoState[k].mode+'.');
    });
    el.textContent=active.length?active.join(' '):'Active una capa de amianto para consultar el inventario.';
  }
  function renderAmiantoAll(){ renderAmiantoPublico(); renderAmiantoPrivado(); updateAmiantoMode(); updateCount(); }

  const defaultOn=['amianto_publico','amianto_privado','littering'];
  rebuildAmiantoFilterCache();
  defaultOn.forEach(k=>layers[k]&&layers[k].addTo(map));
  if(layers.municipios.getBounds().isValid()) map.fitBounds(layers.municipios.getBounds(),{padding:[12,12]});

  const layerInputs=document.querySelectorAll('.grm-layer-toggle');
  const dynamicKeys=new Set(['amianto_publico','amianto_privado']);
  layerInputs.forEach(input=>{
    const key=input.dataset.layer; input.checked=(key==='municipios'||defaultOn.includes(key));
    input.addEventListener('change',()=>{
      if(!layers[key]) return;
      if(input.checked){ if(!map.hasLayer(layers[key])) layers[key].addTo(map); }
      else { if(map.hasLayer(layers[key])) map.removeLayer(layers[key]); if(dynamicKeys.has(key)) layers[key].clearLayers(); }
      if(dynamicKeys.has(key)) renderAmiantoAll(); else updateCount();
    });
  });

  function updateCount(){
    let n=0;
    layerInputs.forEach(input=>{
      if(!input.checked) return; const k=input.dataset.layer; if(k==='municipios') return;
      if(dynamicKeys.has(k)) n+=amiantoState[k].selected||0; else n+=featureCounts[k]||0;
    });
    const el=document.getElementById('grm-visible-count');
    if(el){
      let extra='';
      if(META.public_source_total && META.public_mappable<META.public_source_total) extra+=' Amianto público: '+fmt(META.public_mappable)+' de '+fmt(META.public_source_total)+' registros tienen geometría.';
      if(META.private_source_total && META.private_mappable<META.private_source_total) extra+=' Amianto privado: '+fmt(META.private_mappable)+' de '+fmt(META.private_source_total)+' registros tienen geometría.';
      el.textContent=fmt(n)+' elementos seleccionados.'+extra;
    }
  }

  const select=document.getElementById('grm-municipio-select');
  if(select&&DATA.municipios?.features){
    const names=DATA.municipios.features.map(f=>f.properties.NombreMuni).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
    names.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; select.appendChild(o); });
    select.addEventListener('change',()=>{
      const name=select.value; if(!name){ map.fitBounds(layers.municipios.getBounds(),{padding:[12,12]}); return; }
      let target=null; layers.municipios.eachLayer(l=>{ if(l.feature?.properties?.NombreMuni===name) target=l; });
      if(target){ map.fitBounds(target.getBounds(),{padding:[25,25],maxZoom:14}); target.openTooltip(); }
    });
  }

  document.querySelectorAll('.grm-asb-status').forEach(x=>x.addEventListener('change',()=>{ rebuildAmiantoFilterCache(); renderAmiantoAll(); }));
  document.getElementById('grm-priority-filter')?.addEventListener('change',()=>{ rebuildAmiantoFilterCache(); renderAmiantoAll(); });

  document.getElementById('grm-clear-layers')?.addEventListener('click',()=>{
    layerInputs.forEach(i=>{ const k=i.dataset.layer,on=(k==='municipios'); i.checked=on; if(on&&!map.hasLayer(layers[k])) layers[k].addTo(map); if(!on&&map.hasLayer(layers[k])) map.removeLayer(layers[k]); if(dynamicKeys.has(k)) layers[k].clearLayers(); });
    renderAmiantoAll();
  });
  document.getElementById('grm-default-layers')?.addEventListener('click',()=>{
    layerInputs.forEach(i=>{ const k=i.dataset.layer,on=(k==='municipios'||defaultOn.includes(k)); i.checked=on; if(on&&!map.hasLayer(layers[k])) layers[k].addTo(map); if(!on&&map.hasLayer(layers[k])) map.removeLayer(layers[k]); if(dynamicKeys.has(k)) layers[k].clearLayers(); });
    map.fitBounds(layers.municipios.getBounds(),{padding:[12,12]}); renderAmiantoAll();
  });

  document.getElementById('grm-fullscreen')?.addEventListener('click',()=>{ const wrap=document.querySelector('.grm-viewer'); if(!document.fullscreenElement) wrap.requestFullscreen?.(); else document.exitFullscreen?.(); });
  document.addEventListener('fullscreenchange',()=>setTimeout(()=>map.invalidateSize(),150));
  document.getElementById('grm-panel-toggle')?.addEventListener('click',()=>document.querySelector('.grm-panel')?.classList.toggle('grm-panel-open'));

  let pending=false;
  function scheduleAmiantoRender(){ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false; renderAmiantoAll(); }); }
  map.on('moveend zoomend',scheduleAmiantoRender);

  renderAmiantoAll();
  const versionEl=document.querySelector('.grm-version');
  if(versionEl) versionEl.textContent='Versión 3.1 · '+fmt(PUB.length)+' públicas · '+fmt(META.private_source_total||0)+' privadas · '+fmt(LITTER.length)+' puntos de littering';
  setTimeout(()=>{ map.invalidateSize(); renderAmiantoAll(); },250);
})();
