
(function(){
  const DATA = window.GRM_DATA || {};
  const mapEl = document.getElementById('grm-map');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map(mapEl, { zoomControl:false, preferCanvas:true, minZoom:7, maxZoom:19 });
  L.control.zoom({position:'bottomright'}).addTo(map);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  function esc(v){
    if (v === null || v === undefined || v === '') return '';
    return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }
  function row(label, value){
    if (value === null || value === undefined || String(value).trim()==='') return '';
    return '<div class="grm-popup-row"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
  }
  function popupTitle(props, keys, fallback){
    for (const k of keys) if (props[k]) return esc(props[k]);
    return esc(fallback || 'Elemento');
  }

  const styles = {
    municipios:{color:'#8b8f86',weight:1,fillColor:'#f1efe8',fillOpacity:.12},
    ecoparques:{color:'#2f7d32',fillColor:'#2f7d32'},
    transferencia:{color:'#7b5b45',fillColor:'#7b5b45'},
    envases:{color:'#1f9d3a',fillColor:'#1f9d3a'},
    rsu:{color:'#b1193f',fillColor:'#b1193f'},
    vert_inertes:{color:'#2b6ea6',fillColor:'#2b6ea6'},
    vert_no_peligrosos:{color:'#123e67',fillColor:'#123e67'},
    desguaces:{color:'#dc6d22',fillColor:'#dc6d22'},
    instalaciones_general:{color:'#7b4fa3',fillColor:'#7b4fa3'}
  };
  function markerStyle(key){
    const s=styles[key] || {color:'#555',fillColor:'#555'};
    return {radius:6, color:'#fff', weight:1.5, fillColor:s.fillColor, fillOpacity:.95};
  }

  const layers = {};
  const featureCounts = {};

  layers.municipios = L.geoJSON(DATA.municipios, {
    style: () => styles.municipios,
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(feature.properties.NombreMuni || '', {sticky:true, direction:'top'});
    }
  }).addTo(map);
  featureCounts.municipios = DATA.municipios?.features?.length || 0;

  function buildPointLayer(key, geojson, popupBuilder){
    const layer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, markerStyle(key)),
      onEachFeature: (feature, lyr) => {
        const p=feature.properties || {};
        lyr.bindPopup(popupBuilder(p), {maxWidth:340});
        const t = p.Name || p.NOMBRE_DEL || p['Razón_Soc'] || p.Nombre || '';
        if (t) lyr.bindTooltip(t, {sticky:true});
      }
    });
    featureCounts[key]=geojson?.features?.length || 0;
    return layer;
  }

  layers.ecoparques = buildPointLayer('ecoparques', DATA.ecoparques, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Ecoparque')+'</h4>'+
    row('Municipio',p.Municipio)+'</div>');
  layers.transferencia = buildPointLayer('transferencia', DATA.transferencia, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Estación de transferencia')+'</h4></div>');
  layers.envases = buildPointLayer('envases', DATA.envases, p =>
    '<div class="grm-popup"><h4>Planta de clasificación de envases</h4>'+
    row('Centro',p.NOMBRE_DEL)+row('Titular',p.TITULAR)+row('Titularidad',p.TITULARIDA)+row('Dirección',p['DIRECCIÓN'])+'</div>');
  layers.rsu = buildPointLayer('rsu', DATA.rsu, p =>
    '<div class="grm-popup"><h4>Planta de tratamiento de residuos municipales</h4>'+
    row('Centro',p.NOMBRE_DEL)+row('Titular',p.TITULAR)+row('Titularidad',p.TITULARIDA)+row('Dirección',p['DIRECCIÓN'])+'</div>');
  layers.vert_inertes = buildPointLayer('vert_inertes', DATA.vert_inertes, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Razón_Soc'],'Vertedero de residuos inertes')+'</h4>'+
    row('Tipo',p.Tipo_de_ve)+row('Municipio',p['Población'])+row('Dirección',p.Direcci_1)+'</div>');
  layers.vert_no_peligrosos = buildPointLayer('vert_no_peligrosos', DATA.vert_no_peligrosos, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Razón_Soc'],'Vertedero de residuos no peligrosos')+'</h4>'+
    row('Tipo',p.Tipo_de_ve)+row('Municipio',p['Población'])+row('Dirección',p['Dirección'])+'</div>');
  layers.desguaces = buildPointLayer('desguaces', DATA.desguaces, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Name'],'Centro autorizado')+'</h4>'+
    row('Municipio',p.NombreMuni)+row('Comarca',p.Comarca)+'</div>');
  layers.instalaciones_general = buildPointLayer('instalaciones_general', DATA.instalaciones_general, p =>
    '<div class="grm-popup"><h4>'+popupTitle(p,['Nombre'],'Instalación')+'</h4>'+
    row('Tipos de instalación',p.Tipos)+row('Operaciones',p.Operaciones)+row('Gestión',p.Gestion)+row('Dirección',p.Direccion)+'</div>');

  const defaultOn = ['ecoparques','transferencia','envases','rsu','vert_no_peligrosos'];
  defaultOn.forEach(k => layers[k] && layers[k].addTo(map));

  if (layers.municipios.getBounds().isValid()) map.fitBounds(layers.municipios.getBounds(), {padding:[12,12]});

  const layerInputs = document.querySelectorAll('.grm-layer-toggle');
  layerInputs.forEach(input => {
    const key=input.dataset.layer;
    input.checked = (key==='municipios' || defaultOn.includes(key));
    input.addEventListener('change', ()=>{
      if (!layers[key]) return;
      if (input.checked) layers[key].addTo(map); else map.removeLayer(layers[key]);
      updateCount();
    });
  });

  function updateCount(){
    let n=0;
    layerInputs.forEach(input=>{
      const k=input.dataset.layer;
      if (input.checked && k!=='municipios') n += featureCounts[k] || 0;
    });
    const el=document.getElementById('grm-visible-count');
    if (el) el.textContent=n+' elementos visibles';
  }
  updateCount();

  // Municipality search
  const select=document.getElementById('grm-municipio-select');
  if (select && DATA.municipios?.features){
    const names=DATA.municipios.features.map(f=>f.properties.NombreMuni).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
    names.forEach(n=>{
      const o=document.createElement('option'); o.value=n; o.textContent=n; select.appendChild(o);
    });
    select.addEventListener('change',()=>{
      const name=select.value;
      if (!name){ map.fitBounds(layers.municipios.getBounds(), {padding:[12,12]}); return; }
      let target=null;
      layers.municipios.eachLayer(l=>{
        if (l.feature?.properties?.NombreMuni===name) target=l;
      });
      if(target){ map.fitBounds(target.getBounds(), {padding:[25,25], maxZoom:13}); target.openTooltip(); }
    });
  }

  const clearBtn=document.getElementById('grm-clear-layers');
  if (clearBtn) clearBtn.addEventListener('click',()=>{
    layerInputs.forEach(i=>{
      const k=i.dataset.layer;
      const on=(k==='municipios');
      i.checked=on;
      if(on && !map.hasLayer(layers[k])) layers[k].addTo(map);
      if(!on && map.hasLayer(layers[k])) map.removeLayer(layers[k]);
    });
    updateCount();
  });

  const defaultBtn=document.getElementById('grm-default-layers');
  if (defaultBtn) defaultBtn.addEventListener('click',()=>{
    layerInputs.forEach(i=>{
      const k=i.dataset.layer;
      const on=(k==='municipios'||defaultOn.includes(k));
      i.checked=on;
      if(on && !map.hasLayer(layers[k])) layers[k].addTo(map);
      if(!on && map.hasLayer(layers[k])) map.removeLayer(layers[k]);
    });
    map.fitBounds(layers.municipios.getBounds(), {padding:[12,12]});
    updateCount();
  });

  const fsBtn=document.getElementById('grm-fullscreen');
  if(fsBtn) fsBtn.addEventListener('click',()=>{
    const wrap=document.querySelector('.grm-viewer');
    if (!document.fullscreenElement) wrap.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.addEventListener('fullscreenchange',()=>setTimeout(()=>map.invalidateSize(),150));

  // Collapse panel on small screens
  const panelBtn=document.getElementById('grm-panel-toggle');
  if(panelBtn) panelBtn.addEventListener('click',()=>{
    document.querySelector('.grm-panel')?.classList.toggle('grm-panel-open');
  });

  setTimeout(()=>map.invalidateSize(),250);
})();
