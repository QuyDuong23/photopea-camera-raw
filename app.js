'use strict';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const deepCopy = o => JSON.parse(JSON.stringify(o));
const debounce = (fn,ms=80) => { let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)} };

const defs = {
  exposure:{label:'Exposure',min:-5,max:5,step:.01,group:'light',help:'Độ sáng trung gian, ưu tiên vùng 30–70% theo cách hiểu của Adobe Camera Raw'}, contrast:{label:'Contrast',min:-100,max:100,step:1,group:'light',help:'Tương phản vùng trung gian 30–70%, hạn chế làm đổi điểm trắng và điểm đen'},
  highlights:{label:'Highlights',min:-100,max:100,step:1,group:'light',help:'Khôi phục hoặc tăng vùng sáng 70–90%, không dùng để đặt điểm trắng'}, shadows:{label:'Shadows',min:-100,max:100,step:1,group:'light',help:'Mở hoặc làm sâu vùng tối 10–30%, không dùng để đặt điểm đen'},
  whites:{label:'Whites',min:-100,max:100,step:1,group:'light',help:'Đặt điểm trắng và clipping ở đầu sáng nhất 90–100%'}, blacks:{label:'Blacks',min:-100,max:100,step:1,group:'light',help:'Đặt điểm đen và clipping ở đầu tối nhất 0–10%'},
  temperature:{label:'Temperature',min:-100,max:100,step:1,group:'color'}, tint:{label:'Tint',min:-100,max:100,step:1,group:'color'},
  vibrance:{label:'Vibrance',min:-100,max:100,step:1,group:'color'}, saturation:{label:'Saturation',min:-100,max:100,step:1,group:'color'},
  texture:{label:'Texture',min:-100,max:100,step:1,group:'effects'}, clarity:{label:'Clarity',min:-100,max:100,step:1,group:'effects'},
  dehaze:{label:'Dehaze',min:-100,max:100,step:1,group:'effects'}, vignette:{label:'Vignette',min:-100,max:100,step:1,group:'effects'}, grain:{label:'Grain',min:0,max:100,step:1,group:'effects'},
  sharpening:{label:'Sharpening',min:0,max:150,step:1,group:'detail'}, noiseReduction:{label:'Noise Reduction',min:0,max:100,step:1,group:'detail'}, colorNoise:{label:'Color Noise',min:0,max:100,step:1,group:'detail'},
  distortion:{label:'Distortion',min:-100,max:100,step:1,group:'optics'}, lensVignette:{label:'Lens Vignette',min:-100,max:100,step:1,group:'optics'}, chromatic:{label:'Chromatic Aberration',min:0,max:100,step:1,group:'optics'},
  blur:{label:'Blur Amount',min:0,max:100,step:1,group:'blur'}, bokeh:{label:'Bokeh Boost',min:0,max:100,step:1,group:'blur'}, focus:{label:'Focus Range',min:-100,max:100,step:1,group:'blur'},
  redHue:{label:'Red Primary Hue',min:-100,max:100,step:1,group:'calibration'}, redSat:{label:'Red Primary Sat.',min:-100,max:100,step:1,group:'calibration'},
  greenHue:{label:'Green Primary Hue',min:-100,max:100,step:1,group:'calibration'}, greenSat:{label:'Green Primary Sat.',min:-100,max:100,step:1,group:'calibration'},
  blueHue:{label:'Blue Primary Hue',min:-100,max:100,step:1,group:'calibration'}, blueSat:{label:'Blue Primary Sat.',min:-100,max:100,step:1,group:'calibration'},
  gradeShadowHue:{label:'Hue',min:0,max:360,step:1,group:'grading'}, gradeShadowSat:{label:'Saturation',min:0,max:100,step:1,group:'grading'},
  gradeMidHue:{label:'Hue',min:0,max:360,step:1,group:'grading'}, gradeMidSat:{label:'Saturation',min:0,max:100,step:1,group:'grading'},
  gradeHighHue:{label:'Hue',min:0,max:360,step:1,group:'grading'}, gradeHighSat:{label:'Saturation',min:0,max:100,step:1,group:'grading'},
  gradeBlending:{label:'Blending',min:0,max:100,step:1,group:'grading'}, gradeBalance:{label:'Balance',min:-100,max:100,step:1,group:'grading'}
};
const groups = Object.fromEntries(['light','color','effects','detail','optics','blur','calibration','grading'].map(g=>[g,Object.keys(defs).filter(k=>defs[k].group===g)]));
const hslBandColors = ['#ff4d4f','#ff8a1f','#ffd43b','#52c41a','#2dd4bf','#3b82f6','#8b5cf6','#ec4899'];
const hslNames = ['Reds','Oranges','Yellows','Greens','Aquas','Blues','Purples','Magentas'];
const getMixerGradient = i => `linear-gradient(90deg, ${hslBandColors[(i+7)%8]} 0%, ${hslBandColors[i]} 45%, ${hslBandColors[i]} 55%, ${hslBandColors[(i+1)%8]} 100%)`;
const sliderVisuals = {
  exposure:{gradient:'linear-gradient(90deg,#181818 0%,#595959 30%,#9a9a9a 50%,#d6d6d6 70%,#fafafa 100%)', accent:'#bdbdbd'},
  contrast:{gradient:'linear-gradient(90deg,#3f3f3f 0%,#777 30%,#a8a8a8 50%,#d7d7d7 70%,#f1f1f1 100%)', accent:'#c7c7c7'},
  highlights:{gradient:'linear-gradient(90deg,#555 0%,#777 55%,#b7b7b7 70%,#ededed 90%,#fff 100%)', accent:'#e3e3e3'},
  shadows:{gradient:'linear-gradient(90deg,#080808 0%,#303030 10%,#656565 30%,#909090 50%,#aaa 100%)', accent:'#7e7e7e'},
  whites:{gradient:'linear-gradient(90deg,#5f5f5f 0%,#8a8a8a 72%,#d7d7d7 90%,#ffffff 100%)', accent:'#f2f2f2'},
  blacks:{gradient:'linear-gradient(90deg,#000 0%,#242424 10%,#555 28%,#8a8a8a 100%)', accent:'#8a8a8a'},
  temperature:{gradient:'linear-gradient(90deg,#6f63ff 0%, #7cc7ff 28%, #d5d5d5 50%, #ffe27a 74%, #ffb547 100%)', accent:'#d5d5d5'},
  tint:{gradient:'linear-gradient(90deg,#41b96b 0%, #95d4ac 20%, #d5d5d5 50%, #e08cff 78%, #b14eff 100%)', accent:'#d58fff'},
  vibrance:{gradient:'linear-gradient(90deg,#8a8a8a 0%, #7ed2ff 24%, #72d96d 42%, #ffd257 66%, #ff6e6e 100%)', accent:'#7ed2ff'},
  saturation:{gradient:'linear-gradient(90deg,#8a8a8a 0%, #6dc8ff 20%, #64df6a 42%, #ffe164 64%, #ff6fa9 82%, #ff6666 100%)', accent:'#ffd257'},
  redHue:{gradient:'linear-gradient(90deg,#ff66b4 0%, #ff4d4f 45%, #ff8a1f 100%)', accent:'#ff5b67'},
  redSat:{gradient:'linear-gradient(90deg,#7a5a5a 0%, #ff4d4f 100%)', accent:'#ff5b67'},
  greenHue:{gradient:'linear-gradient(90deg,#ffd43b 0%, #52c41a 45%, #2dd4bf 100%)', accent:'#61d52c'},
  greenSat:{gradient:'linear-gradient(90deg,#5f7263 0%, #52c41a 100%)', accent:'#61d52c'},
  blueHue:{gradient:'linear-gradient(90deg,#2dd4bf 0%, #3b82f6 45%, #8b5cf6 100%)', accent:'#5d99ff'},
  blueSat:{gradient:'linear-gradient(90deg,#5a6882 0%, #3b82f6 100%)', accent:'#5d99ff'},
  gradeShadowHue:{gradient:'linear-gradient(90deg,#ff4d4f 0%, #ff8a1f 16%, #ffd43b 32%, #52c41a 48%, #2dd4bf 64%, #3b82f6 80%, #8b5cf6 90%, #ec4899 100%)', accent:'#8fc8ff'},
  gradeMidHue:{gradient:'linear-gradient(90deg,#ff4d4f 0%, #ff8a1f 16%, #ffd43b 32%, #52c41a 48%, #2dd4bf 64%, #3b82f6 80%, #8b5cf6 90%, #ec4899 100%)', accent:'#8fc8ff'},
  gradeHighHue:{gradient:'linear-gradient(90deg,#ff4d4f 0%, #ff8a1f 16%, #ffd43b 32%, #52c41a 48%, #2dd4bf 64%, #3b82f6 80%, #8b5cf6 90%, #ec4899 100%)', accent:'#8fc8ff'},
  gradeShadowSat:{gradient:'linear-gradient(90deg,#6e6e6e 0%, #3b82f6 100%)', accent:'#6ea8ff'},
  gradeMidSat:{gradient:'linear-gradient(90deg,#6e6e6e 0%, #3b82f6 100%)', accent:'#6ea8ff'},
  gradeHighSat:{gradient:'linear-gradient(90deg,#6e6e6e 0%, #3b82f6 100%)', accent:'#6ea8ff'}
};
const defaults = Object.fromEntries(Object.keys(defs).map(k=>[k,0]));
defaults.sharpening=0; defaults.gradeBlending=50;
defaults.curve=[0,.25,.5,.75,1];
defaults.hsl={hue:Array(8).fill(0),sat:Array(8).fill(0),lum:Array(8).fill(0)};
let params=deepCopy(defaults), history=[deepCopy(params)], historyIndex=0, hslMode='hue';
let imageBitmap=null, sourceName='', sourceMeta=null, sourceFromPhotopea=false;
let gl, program, texture, vao, maxTextureSize=4096, previewScaleMode='fit';
let renderQueued=false, histogramTimer=null, photopeaPhase='idle', beforeDown=false;
const isPopup=new URLSearchParams(location.search).has('popup'); let popupRef=null;

const canvas=$('#preview'), wrap=$('#canvasWrap'), loading=$('#loading'), statusEl=$('#status'), docInfo=$('#docInfo');

function makeSlider(key, parent, valueGetter=()=>params[key], valueSetter=v=>params[key]=v){
  const d=defs[key]; const row=document.createElement('div'); row.className='control-row'; row.dataset.key=key; if(d.help) row.title=d.help;
  const visual=sliderVisuals[key];
  row.innerHTML=`<label for="r_${key}">${d.label}</label><div class="range-shell${visual?' has-visual':''}">${visual?`<div class="color-band"></div>`:''}<input id="r_${key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}"></div><input type="number" min="${d.min}" max="${d.max}" step="${d.step}">`;
  const shell=$('.range-shell',row), range=$('input[type=range]',row), num=$('input[type=number]',row);
  if(visual){
    row.classList.add('colorized-row');
    row.style.setProperty('--slider-grad', visual.gradient);
    row.style.setProperty('--slider-accent', visual.accent || '#a7a7a7');
    range.style.accentColor = visual.accent || '#a7a7a7';
    num.style.borderColor = (visual.accent || '#a7a7a7') + '55';
  }
  const sync=v=>{v=clamp(Number(v)||0,d.min,d.max);valueSetter(v);range.value=v;num.value=(d.step<1?v.toFixed(2):Math.round(v));queueRender();};
  range.value=valueGetter(); num.value=valueGetter();
  range.addEventListener('input',e=>sync(e.target.value)); num.addEventListener('input',e=>sync(e.target.value));
  range.addEventListener('change',commitHistory); num.addEventListener('change',commitHistory);
  parent.appendChild(row); return {row,range,num,sync,shell};
}
function buildControls(){
  for(const k of groups.light) makeSlider(k,$('#lightControls'));
  for(const k of groups.color) makeSlider(k,$('#colorControls'));
  for(const k of groups.effects) makeSlider(k,$('#effectControls'));
  for(const k of groups.detail) makeSlider(k,$('#detailControls'));
  for(const k of groups.optics) makeSlider(k,$('#opticsControls'));
  for(const k of groups.blur) makeSlider(k,$('#blurControls'));
  for(const k of groups.calibration) makeSlider(k,$('#calibrationControls'));
  buildGrading(); buildHsl();
}
function buildGrading(){
  const root=$('#gradingControls'); root.innerHTML='';
  [['Shadows','gradeShadowHue','gradeShadowSat'],['Midtones','gradeMidHue','gradeMidSat'],['Highlights','gradeHighHue','gradeHighSat']].forEach(([title,h,s])=>{
    const block=document.createElement('div');block.className='grade-block';
    block.innerHTML=`<div class="grade-title"><span class="grade-swatch"></span><strong>${title}</strong></div><div class="slider-list"></div>`;
    const sw=$('.grade-swatch',block), list=$('.slider-list',block);
    makeSlider(h,list);makeSlider(s,list);
    const update=()=>sw.style.background=`hsl(${params[h]}  ${params[s]}% 50%)`;
    $$('input',block).forEach(i=>i.addEventListener('input',update));update();root.appendChild(block);
  });
  const list=document.createElement('div');list.className='slider-list';root.appendChild(list);
  makeSlider('gradeBlending',list);makeSlider('gradeBalance',list);
}
function renderMixerLegend(){
  const legend=$('#mixerLegend'); if(!legend) return; legend.innerHTML='';
  hslNames.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='mixer-chip';
    chip.style.setProperty('--chip-color',hslBandColors[i]);
    chip.innerHTML=`<span></span>${name}`;
    legend.appendChild(chip);
  });
}
function buildHsl(){
  const root=$('#hslControls'); root.innerHTML=''; renderMixerLegend();
  hslNames.forEach((name,i)=>{
    const fakeKey=`hsl_${hslMode}_${i}`; const row=document.createElement('div');row.className='control-row mixer-row';
    row.id=`mixer_row_${fakeKey}`;
    row.style.setProperty('--mixer-color', hslBandColors[i]);
    row.style.setProperty('--mixer-grad', getMixerGradient(i));
    row.innerHTML=`<label><span class="mixer-label"><span class="mixer-swatch"></span>${name}</span></label><div class="mixer-slider-wrap"><div class="mixer-slider-band"></div><input type="range" min="-100" max="100" step="1"></div><input type="number" min="-100" max="100" step="1">`;
    const r=$('input[type=range]',row),n=$('input[type=number]',row);r.value=n.value=params.hsl[hslMode][i];
    r.style.accentColor = hslBandColors[i];
    n.style.borderColor = hslBandColors[i] + '55';
    const set=v=>{v=clamp(Number(v)||0,-100,100);params.hsl[hslMode][i]=v;r.value=n.value=Math.round(v);queueRender()};
    r.addEventListener('input',e=>set(e.target.value));n.addEventListener('input',e=>set(e.target.value));r.addEventListener('change',commitHistory);n.addEventListener('change',commitHistory);
    root.appendChild(row);
  });
}
function refreshControls(){
  Object.keys(defs).forEach(k=>{const r=$(`#r_${k}`);if(r){r.value=params[k];const n=r.closest('.control-row')?.querySelector('input[type=number]'); if(n) n.value=defs[k].step<1?params[k].toFixed(2):Math.round(params[k]);}});
  buildHsl(); drawCurve(); updateGradeSwatches(); queueRender(); updateUndoButtons();
}
function updateGradeSwatches(){
  const vals=[['gradeShadowHue','gradeShadowSat'],['gradeMidHue','gradeMidSat'],['gradeHighHue','gradeHighSat']];
  $$('.grade-swatch').forEach((sw,i)=>{const [h,s]=vals[i];sw.style.background=`hsl(${params[h]} ${params[s]}% 50%)`;});
  vals.forEach(([h,s])=>{
    const satRow=$(`#r_${s}`)?.closest('.control-row');
    if(satRow){
      const hue=params[h];
      satRow.style.setProperty('--slider-grad', `linear-gradient(90deg,#6e6e6e 0%, hsl(${hue} 85% 55%) 100%)`);
      satRow.style.setProperty('--slider-accent', `hsl(${hue} 85% 70%)`);
      const range=satRow.querySelector('input[type=range]');
      if(range) range.style.accentColor=`hsl(${hue} 85% 70%)`;
    }
  });
}

function commitHistory(){
  const snap=JSON.stringify(params); if(JSON.stringify(history[historyIndex])===snap)return;
  history=history.slice(0,historyIndex+1); history.push(deepCopy(params)); if(history.length>40)history.shift(); else historyIndex++; updateUndoButtons();
}
function undo(){if(historyIndex>0){historyIndex--;params=deepCopy(history[historyIndex]);refreshControls();}}
function redo(){if(historyIndex<history.length-1){historyIndex++;params=deepCopy(history[historyIndex]);refreshControls();}}
function updateUndoButtons(){$('#btnUndo').disabled=historyIndex<=0;$('#btnRedo').disabled=historyIndex>=history.length-1;}

const vertexShader=`#version 300 es
in vec2 aPos; out vec2 vUv; void main(){vUv=vec2((aPos.x+1.0)*0.5,1.0-(aPos.y+1.0)*0.5);gl_Position=vec4(aPos,0,1);}`;
const fragmentShader=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor; uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uOutput;
uniform float uExposure,uContrast,uHighlights,uShadows,uWhites,uBlacks,uTemperature,uTint,uVibrance,uSaturation;
uniform float uTexture,uClarity,uDehaze,uVignette,uGrain,uSharpen,uNoise,uColorNoise;
uniform float uDistortion,uLensVignette,uChromatic,uBlur,uBokeh,uFocus;
uniform float uRedHue,uRedSat,uGreenHue,uGreenSat,uBlueHue,uBlueSat;
uniform float uGradeShadowHue,uGradeShadowSat,uGradeMidHue,uGradeMidSat,uGradeHighHue,uGradeHighSat,uGradeBlend,uGradeBalance;
uniform float uCurve[5]; uniform float uHslHue[8],uHslSat[8],uHslLum[8]; uniform float uBefore;
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 rgb2hsl(vec3 c){float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),d=mx-mn;float h=0.0; if(d>1e-5){if(mx==c.r)h=mod((c.g-c.b)/d,6.0);else if(mx==c.g)h=(c.b-c.r)/d+2.0;else h=(c.r-c.g)/d+4.0;h/=6.0;if(h<0.0)h+=1.0;}float l=(mx+mn)*.5;float s=d<1e-5?0.0:d/(1.0-abs(2.0*l-1.0));return vec3(h,s,l);}
float hue2rgb(float p,float q,float t){if(t<0.0)t+=1.0;if(t>1.0)t-=1.0;if(t<1.0/6.0)return p+(q-p)*6.0*t;if(t<.5)return q;if(t<2.0/3.0)return p+(q-p)*(2.0/3.0-t)*6.0;return p;}
vec3 hsl2rgb(vec3 h){if(h.y<1e-5)return vec3(h.z);float q=h.z<.5?h.z*(1.0+h.y):h.z+h.y-h.z*h.y;float p=2.0*h.z-q;return vec3(hue2rgb(p,q,h.x+1.0/3.0),hue2rgb(p,q,h.x),hue2rgb(p,q,h.x-1.0/3.0));}
vec3 hsvColor(float h){vec3 p=abs(fract(vec3(h)+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0);return clamp(p-1.0,0.0,1.0);}
float cd(float a,float b){float d=abs(a-b);return min(d,1.0-d);}
float curveMap(float x){float seg=clamp(x*4.0,0.0,3.9999);int i=int(floor(seg));float t=fract(seg);float a=uCurve[i],b=uCurve[i+1];return mix(a,b,t);}
vec3 toneCurve(vec3 c){return vec3(curveMap(c.r),curveMap(c.g),curveMap(c.b));}
vec3 setLuminancePreserveHue(vec3 c,float targetY){
  float y=clamp(lum(c),0.00001,0.99999); targetY=clamp(targetY,0.0,1.0);
  if(targetY>=y){float t=(targetY-y)/max(1.0-y,0.00001);return mix(c,vec3(1.0),clamp(t,0.0,1.0));}
  return c*(targetY/y);
}
float adjustExposureACR(float y,float ev){
  // Endpoint-preserving exposure curve: strongest visual change stays in the midtones.
  float exponent=exp2(-ev*0.42);
  return pow(clamp(y,0.00001,1.0),exponent);
}
float adjustContrastACR(float y,float amount){
  // Monotonic midtone S-curve. 0 and 1 remain fixed for Whites / Blacks.
  float midWeight=4.0*y*(1.0-y);
  return clamp(y+(y-0.5)*amount*0.45*midWeight,0.0,1.0);
}
float adjustHighlightsACR(float y,float amount){
  // Anchored above 52%; greatest visible response falls around the 70–90% region.
  const float pivot=0.52;
  if(y<=pivot)return y;
  float t=clamp((y-pivot)/(1.0-pivot),0.0,1.0);
  float power=1.0+abs(amount)*1.45;
  float mapped=amount>=0.0 ? pow(t,1.0/power) : pow(t,power);
  return pivot+mapped*(1.0-pivot);
}
float adjustShadowsACR(float y,float amount){
  // Anchored below 48%; greatest visible response falls around the 10–30% region.
  const float pivot=0.48;
  if(y>=pivot)return y;
  float t=clamp(y/pivot,0.0,1.0);
  float power=1.0+abs(amount)*1.45;
  float mapped=amount>=0.0 ? pow(t,1.0/power) : pow(t,power);
  return mapped*pivot;
}
float adjustWhitesACR(float y,float amount){
  // White-point control. Positive values lower the clipping threshold; negative values pull the endpoint down.
  const float pivot=0.76;
  if(y<=pivot)return y;
  float t=clamp((y-pivot)/(1.0-pivot),0.0,1.0);
  if(amount>=0.0){
    float threshold=1.0-(1.0-(pivot+0.03))*amount*0.90;
    float clippedT=clamp((y-pivot)/max(threshold-pivot,0.00001),0.0,1.0);
    return pivot+clippedT*(1.0-pivot);
  }
  float scale=1.0-(-amount)*0.55;
  return pivot+t*(1.0-pivot)*scale;
}
float adjustBlacksACR(float y,float amount){
  // Black-point control. Negative values raise the clipping threshold; positive values lift the endpoint.
  const float pivot=0.24;
  if(y>=pivot)return y;
  if(amount<0.0){
    float blackPoint=(pivot-0.03)*(-amount)*0.92;
    float mappedT=clamp((y-blackPoint)/max(pivot-blackPoint,0.00001),0.0,1.0);
    return pivot*mappedT;
  }
  return pivot-(pivot-y)*(1.0-amount*0.65);
}
float rgbSat(vec3 c){float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b)); return mx-mn;}
vec3 applyChroma(vec3 rgb, float scale){float y=lum(rgb); return vec3(y) + (rgb-vec3(y))*scale;}
void main(){
  vec2 p=vUv-.5; float r2=dot(p,p); vec2 uv=.5+p*(1.0+uDistortion*r2*.9);
  vec2 ca=p*uChromatic*.012; vec3 center=vec3(texture(uTex,uv+ca).r,texture(uTex,uv).g,texture(uTex,uv-ca).b);
  if(uBefore>.5){outColor=vec4(center,1);return;}
  vec2 t=uTexel; vec3 n1=texture(uTex,uv+vec2(t.x,0)).rgb,n2=texture(uTex,uv-vec2(t.x,0)).rgb,n3=texture(uTex,uv+vec2(0,t.y)).rgb,n4=texture(uTex,uv-vec2(0,t.y)).rgb;
  vec3 avg=(n1+n2+n3+n4)*.25; vec3 wide=(texture(uTex,uv+2.5*vec2(t.x,0)).rgb+texture(uTex,uv-2.5*vec2(t.x,0)).rgb+texture(uTex,uv+2.5*vec2(0,t.y)).rgb+texture(uTex,uv-2.5*vec2(0,t.y)).rgb)*.25;
  vec3 c=mix(center,avg,uNoise*.65); float y=lum(c); vec3 chroma=c-vec3(y); c=vec3(y)+chroma*(1.0-uColorNoise*.75);
  c += (center-avg)*(uSharpen*2.2+uTexture*.8); c += (center-wide)*uClarity*.85;
  c=mix(c,avg,uBlur*.75); c+=max(vec3(0),c-vec3(.72))*uBokeh*.35;
  c.r*=1.0+uTemperature*.22; c.b*=1.0-uTemperature*.22; c.g*=1.0-uTint*.12; c.r+=uTint*.055; c.b+=uTint*.055;
  // Light v2.1.6: target the tonal zones used by Adobe's Basic-panel model.
  // Exposure / Contrast prioritize 30–70%, Highlights 70–90%, Shadows 10–30%,
  // while Whites and Blacks establish the 90–100% and 0–10% clipping endpoints.
  c=clamp(c,0.0,1.0);
  y=lum(c); c=setLuminancePreserveHue(c,adjustExposureACR(y,uExposure));
  y=lum(c); c=setLuminancePreserveHue(c,adjustContrastACR(y,uContrast));
  y=lum(c); c=setLuminancePreserveHue(c,adjustHighlightsACR(y,uHighlights));
  y=lum(c); c=setLuminancePreserveHue(c,adjustShadowsACR(y,uShadows));
  y=lum(c); c=setLuminancePreserveHue(c,adjustWhitesACR(y,uWhites));
  y=lum(c); c=setLuminancePreserveHue(c,adjustBlacksACR(y,uBlacks));
  c=(c-.5)*(1.0+uDehaze*.45)+.5;

  // Color Mixer v2.1.6: use a lightly spatial-smoothed selector, normalize only
  // the hue kernels, and apply chroma masks after normalization. This avoids
  // amplifying tiny hue noise in low-saturation / textured pixels into spots.
  vec3 workRgb=clamp(c,0.0,1.0);
  vec3 selectorRgb=clamp(mix(workRgb,avg,0.28),0.0,1.0);
  vec3 hsl=rgb2hsl(workRgb);
  vec3 selectorHsl=rgb2hsl(selectorRgb);
  float centers[8]=float[8](0.0,.08333,.16667,.33333,.5,.66667,.77778,.91667);
  float dh=0.0,ds=0.0,dl=0.0,ws=0.0;
  for(int i=0;i<8;i++){
    float dist=cd(selectorHsl.x,centers[i]);
    float w=1.0-smoothstep(0.055,0.185,dist);
    w=w*w*(3.0-2.0*w);
    dh+=uHslHue[i]*w;
    ds+=uHslSat[i]*w;
    dl+=uHslLum[i]*w;
    ws+=w;
  }
  if(ws>0.0001){
    float chromaMask=smoothstep(0.075,0.30,selectorHsl.y);
    float shadowMask=smoothstep(0.018,0.11,selectorHsl.z);
    float highlightMask=1.0-smoothstep(0.90,0.985,selectorHsl.z);
    float mixerMask=chromaMask*shadowMask*highlightMask;
    float hueAdj=(dh/ws)*mixerMask;
    float satAdj=(ds/ws)*mixerMask;
    float lumAdj=(dl/ws)*mixerMask;

    // Hue is rotated only where chroma is reliable.
    hsl.x=fract(hsl.x+hueAdj*(0.070+0.025*hsl.y)+1.0);
    // Luminance keeps a soft roll-off around black and white.
    hsl.z=clamp(hsl.z+lumAdj*(0.16+0.20*(1.0-abs(hsl.z-0.5)*2.0)),0.0,1.0);

    // Selective saturation is applied as smooth RGB chroma scaling instead of
    // directly editing HSL saturation. At -100 it reaches neutral gray without
    // unstable hue flips or salt-and-pepper color remnants.
    vec3 mixerRgb=hsl2rgb(hsl);
    float mixerY=lum(mixerRgb);
    float satScale=satAdj<0.0 ? max(0.0,1.0+satAdj) : 1.0+satAdj*1.35;
    c=vec3(mixerY)+(mixerRgb-vec3(mixerY))*satScale;
  }else{
    c=workRgb;
  }

  c=clamp(c,0.0,1.0);
  c=applyChroma(c, max(0.0, 1.0 + uSaturation));
  c=clamp(c,0.0,1.0);
  float vibSat=rgbSat(c);
  float vibY=lum(c);
  float vibMask=(1.0-smoothstep(0.10,0.78,vibSat))*smoothstep(0.03,0.18,vibY)*(1.0-smoothstep(0.82,0.98,vibY));
  float skinMask=smoothstep(0.015,0.22,c.r-c.b)*smoothstep(-0.02,0.12,c.g-c.b);
  float vibAmt=uVibrance*vibMask*mix(1.0,0.72,skinMask);
  float vibScale=vibAmt>=0.0 ? 1.0 + vibAmt*1.05 : max(0.0,1.0 + vibAmt*0.85);
  c=applyChroma(c, vibScale);
  c=toneCurve(clamp(c,0.0,1.0)); y=lum(c);
  float bal=uGradeBalance*.25;float sw=1.0-smoothstep(.15+bal,.58+bal,y),hw=smoothstep(.42+bal,.88+bal,y),mw=clamp(1.0-sw-hw,0.0,1.0);float blend=.45+.55*uGradeBlend;
  c+=(hsvColor(uGradeShadowHue)-.5)*uGradeShadowSat*sw*.55*blend;c+=(hsvColor(uGradeMidHue)-.5)*uGradeMidSat*mw*.48*blend;c+=(hsvColor(uGradeHighHue)-.5)*uGradeHighSat*hw*.5*blend;
  float rr=c.r,gg=c.g,bb=c.b;c.r=rr*(1.0+uRedSat*.22)+gg*uRedHue*.09-bb*uRedHue*.06;c.g=gg*(1.0+uGreenSat*.22)+bb*uGreenHue*.09-rr*uGreenHue*.06;c.b=bb*(1.0+uBlueSat*.22)+rr*uBlueHue*.09-gg*uBlueHue*.06;
  float vig=smoothstep(.18,.72,length(p));c*=1.0-uLensVignette*vig*.7;c*=1.0-uVignette*vig*.65;
  float focusMask=abs(vUv.y-(.5+uFocus*.25));c=mix(c,avg,uBlur*smoothstep(.05,.48,focusMask)*.25);
  c+=(hash(gl_FragCoord.xy)-.5)*uGrain*.12;outColor=vec4(clamp(c,0.0,1.0),1.0);
}`;

function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function initGL(){
  gl=canvas.getContext('webgl2',{antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false}); if(!gl)throw new Error('Trình duyệt không hỗ trợ WebGL 2.');
  const vs=compile(gl.VERTEX_SHADER,vertexShader),fs=compile(gl.FRAGMENT_SHADER,fragmentShader);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function set1(name,v){const l=gl.getUniformLocation(program,name);if(l!==null)gl.uniform1f(l,v)}
function setParams(before=false){
  gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'uTex'),0);gl.uniform2f(gl.getUniformLocation(program,'uTexel'),1/imageBitmap.width,1/imageBitmap.height);gl.uniform2f(gl.getUniformLocation(program,'uOutput'),canvas.width,canvas.height);
  const m={uExposure:params.exposure,uContrast:params.contrast/100,uHighlights:params.highlights/100,uShadows:params.shadows/100,uWhites:params.whites/100,uBlacks:params.blacks/100,uTemperature:params.temperature/100,uTint:params.tint/100,uVibrance:params.vibrance/100,uSaturation:params.saturation/100,uTexture:params.texture/100,uClarity:params.clarity/100,uDehaze:params.dehaze/100,uVignette:-params.vignette/100,uGrain:params.grain/100,uSharpen:params.sharpening/150,uNoise:params.noiseReduction/100,uColorNoise:params.colorNoise/100,uDistortion:params.distortion/100,uLensVignette:-params.lensVignette/100,uChromatic:params.chromatic/100,uBlur:params.blur/100,uBokeh:params.bokeh/100,uFocus:params.focus/100,uRedHue:params.redHue/100,uRedSat:params.redSat/100,uGreenHue:params.greenHue/100,uGreenSat:params.greenSat/100,uBlueHue:params.blueHue/100,uBlueSat:params.blueSat/100,uGradeShadowHue:params.gradeShadowHue/360,uGradeShadowSat:params.gradeShadowSat/100,uGradeMidHue:params.gradeMidHue/360,uGradeMidSat:params.gradeMidSat/100,uGradeHighHue:params.gradeHighHue/360,uGradeHighSat:params.gradeHighSat/100,uGradeBlend:params.gradeBlending/100,uGradeBalance:params.gradeBalance/100,uBefore:before?1:0};
  Object.entries(m).forEach(([k,v])=>set1(k,v));gl.uniform1fv(gl.getUniformLocation(program,'uCurve'),new Float32Array(params.curve));gl.uniform1fv(gl.getUniformLocation(program,'uHslHue'),new Float32Array(params.hsl.hue.map(v=>v/100)));gl.uniform1fv(gl.getUniformLocation(program,'uHslSat'),new Float32Array(params.hsl.sat.map(v=>v/100)));gl.uniform1fv(gl.getUniformLocation(program,'uHslLum'),new Float32Array(params.hsl.lum.map(v=>v/100)));
}
function uploadTexture(){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imageBitmap);}
function setCanvasPreviewSize(){
  if(!imageBitmap)return; const rect=wrap.getBoundingClientRect(); const pad=20, maxW=Math.max(64,rect.width-pad),maxH=Math.max(64,rect.height-pad); let w=imageBitmap.width,h=imageBitmap.height;
  let s=previewScaleMode==='100'?1:Math.min(maxW/w,maxH/h); if(previewScaleMode==='100')s=Math.min(1,Math.max(.1,devicePixelRatio));
  const cssW=Math.max(1,Math.round(w*s)),cssH=Math.max(1,Math.round(h*s));const dpr=Math.min(devicePixelRatio||1,2);canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.max(1,Math.round(cssW*dpr));canvas.height=Math.max(1,Math.round(cssH*dpr));
}
function render(before=beforeDown){if(!imageBitmap)return;setCanvasPreviewSize();gl.viewport(0,0,canvas.width,canvas.height);setParams(before);gl.drawArrays(gl.TRIANGLES,0,6);scheduleHistogram();}
function queueRender(){if(!imageBitmap||renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render();});}
function scheduleHistogram(){clearTimeout(histogramTimer);histogramTimer=setTimeout(drawHistogram,180)}
function drawHistogram(){
  if(!imageBitmap)return;const hc=$('#histogram'),ctx=hc.getContext('2d');ctx.clearRect(0,0,hc.width,hc.height);let data;try{const tw=Math.min(canvas.width,400),th=Math.max(1,Math.round(canvas.height*tw/canvas.width));const tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;const tctx=tmp.getContext('2d');tctx.drawImage(canvas,0,0,tw,th);data=tctx.getImageData(0,0,tw,th).data;}catch{return}
  const bins=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)];let max=1;for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){const v=data[i+c];bins[c][v]++;max=Math.max(max,bins[c][v]);}}
  ctx.globalCompositeOperation='lighter';['#f44','#4f4','#48f'].forEach((color,c)=>{ctx.strokeStyle=color;ctx.globalAlpha=.6;ctx.beginPath();for(let i=0;i<256;i++){const x=i/255*hc.width,y=hc.height-Math.sqrt(bins[c][i]/max)*hc.height;(i?ctx.lineTo(x,y):ctx.moveTo(x,y));}ctx.stroke();});ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
async function loadBitmapFromBlob(blob,name='image.png',fromPhotopea=false){
  showLoading(true);try{let bmp=await createImageBitmap(blob);if(bmp.width>maxTextureSize||bmp.height>maxTextureSize){const scale=Math.min(maxTextureSize/bmp.width,maxTextureSize/bmp.height);const c=document.createElement('canvas');c.width=Math.floor(bmp.width*scale);c.height=Math.floor(bmp.height*scale);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close();bmp=await createImageBitmap(c);setStatus(`Ảnh vượt giới hạn GPU, đã thu nhỏ còn ${bmp.width}×${bmp.height}.`);}imageBitmap?.close?.();imageBitmap=bmp;sourceName=name;sourceFromPhotopea=fromPhotopea;uploadTexture();wrap.classList.remove('empty');$('#emptyState').classList.add('hidden');docInfo.textContent=`${name}  •  ${bmp.width} × ${bmp.height}`;render();setStatus('Đã tải ảnh.');}catch(e){setStatus('Lỗi: '+e.message,true)}finally{showLoading(false);}
}
function showLoading(on){loading.classList.toggle('hidden',!on)}function setStatus(t,err=false){statusEl.textContent=t;statusEl.style.color=err?'#ff777d':'#aaa'}

async function exportBlob(){
  if(!imageBitmap)throw new Error('Chưa có ảnh.');showLoading(true);const ow=canvas.width,oh=canvas.height,sw=canvas.style.width,sh=canvas.style.height;try{canvas.width=imageBitmap.width;canvas.height=imageBitmap.height;canvas.style.width=imageBitmap.width+'px';canvas.style.height=imageBitmap.height+'px';gl.viewport(0,0,canvas.width,canvas.height);setParams(false);gl.drawArrays(gl.TRIANGLES,0,6);const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Không thể xuất PNG.')),'image/png'));return blob;}finally{canvas.width=ow;canvas.height=oh;canvas.style.width=sw;canvas.style.height=sh;gl.viewport(0,0,ow,oh);render();showLoading(false);}
}
async function downloadPNG(){try{const blob=await exportBlob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(sourceName.replace(/\.[^.]+$/,'')||'camera-raw')+'-edited.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);setStatus('Đã xuất PNG.');}catch(e){setStatus(e.message,true)}}

function postToPhotopea(payload){
  if(isPopup&&window.opener){window.opener.postMessage({__CRAW_TO_PHOTOPEA__:true,payload},'*');}
  else window.parent.postMessage(payload,'*');
}
function sendScript(script){postToPhotopea(script)}
function requestFromPhotopea(){sourceMeta=null;sourceFromPhotopea=true;photopeaPhase='waiting-source';setStatus('Đang lấy ảnh từ Photopea…');sendScript(`(function(){if(!app.documents||app.documents.length===0){app.echoToOE("__CRAW_ERROR__NO_DOCUMENT");return;}var d=app.activeDocument;app.echoToOE("__CRAW_META__"+JSON.stringify({name:d.name,source:d.source,width:Number(d.width),height:Number(d.height)}));d.saveToOE("png");})();`)}
async function applyToPhotopea(){
  if(!imageBitmap){setStatus('Chưa có ảnh.',true);return}try{const blob=await exportBlob();const buf=await blob.arrayBuffer();photopeaPhase='waiting-temp-open';setStatus('Đang đưa ảnh đã chỉnh vào Photopea…');postToPhotopea(buf);}catch(e){setStatus(e.message,true)}
}
function applyPasteScript(){
  const src=JSON.stringify(sourceMeta?.source||''), name=JSON.stringify(sourceMeta?.name||'');
  return `(function(){try{if(app.documents.length<2){app.echoToOE("__CRAW_ERROR__TEMP_NOT_OPEN");return;}var temp=app.activeDocument,target=null;var src=${src},nm=${name};for(var i=0;i<app.documents.length;i++){var d=app.documents[i];if(d==temp)continue;if((src&&d.source==src)||(nm&&d.name==nm)){target=d;break;}}if(!target)target=app.documents[app.documents.length-2];temp.selection.selectAll();temp.selection.copy(true);temp.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=target;target.paste();target.activeLayer.name="Camera Raw Studio";app.echoToOE("__CRAW_APPLIED__");}catch(e){app.echoToOE("__CRAW_ERROR__"+e.toString());}})();`;
}
async function handlePhotopeaMessage(d){
  if(typeof d==='string'){
    if(d.startsWith('__CRAW_META__')){try{sourceMeta=JSON.parse(d.slice(13));sourceName=sourceMeta.name||'Photopea.png';}catch{}return}
    if(d==='__CRAW_ERROR__NO_DOCUMENT'){photopeaPhase='idle';setStatus('Photopea chưa có tài liệu đang mở.',true);return}
    if(d==='__CRAW_APPLIED__'){photopeaPhase='idle';setStatus('Đã áp dụng thành layer “Camera Raw Studio”.');return}
    if(d.startsWith('__CRAW_ERROR__')){photopeaPhase='idle';setStatus('Photopea: '+d.slice(14),true);return}
    if(d==='done'&&photopeaPhase==='waiting-temp-open'){photopeaPhase='waiting-paste';sendScript(applyPasteScript());return}
    if(d==='done'&&photopeaPhase==='waiting-paste'){return}
  }
  if(d instanceof ArrayBuffer&&photopeaPhase==='waiting-source'){photopeaPhase='idle';await loadBitmapFromBlob(new Blob([d],{type:'image/png'}),sourceMeta?.name||'Photopea.png',true);}
}
window.addEventListener('message',async e=>{
  const d=e.data;
  if(!isPopup && e.source!==window.parent && d&&d.__CRAW_TO_PHOTOPEA__){postToPhotopea(d.payload);return;}
  if(isPopup){if(e.source===window.opener&&d&&d.__CRAW_FROM_PHOTOPEA__)await handlePhotopeaMessage(d.payload);return;}
  if(e.source===window.parent){
    if(popupRef&&!popupRef.closed)popupRef.postMessage({__CRAW_FROM_PHOTOPEA__:true,payload:d},'*');
    await handlePhotopeaMessage(d);
  }
});

const presets={
  neutral:{},portrait:{exposure:.2,contrast:-8,highlights:-25,shadows:22,whites:8,blacks:-5,temperature:6,tint:3,vibrance:14,texture:-8,clarity:-5,sharpening:25},
  landscape:{contrast:18,highlights:-18,shadows:15,whites:18,blacks:-14,vibrance:28,saturation:5,texture:20,clarity:18,dehaze:12,sharpening:40},
  cinematic:{contrast:16,highlights:-32,shadows:18,blacks:-18,saturation:-8,clarity:10,grain:18,gradeShadowHue:195,gradeShadowSat:28,gradeMidHue:32,gradeMidSat:8,gradeHighHue:38,gradeHighSat:20,gradeBalance:-12,curve:[.03,.18,.5,.82,.97]},
  bw:{saturation:-100,contrast:30,highlights:-25,shadows:20,whites:15,blacks:-22,clarity:15,grain:25,curve:[0,.18,.48,.82,1]},
  dream:{exposure:.25,contrast:-12,highlights:-15,shadows:25,temperature:8,vibrance:16,texture:-18,clarity:-22,dehaze:-10,vignette:-12,blur:6,bokeh:30,gradeHighHue:42,gradeHighSat:16}
};
const presetLabels={neutral:'Neutral',portrait:'Portrait Soft',landscape:'Landscape Pop',cinematic:'Cinematic Teal',bw:'B&W Contrast',dream:'Dream Glow'};
const PRESET_STORAGE_KEY='cameraRawStudio.customPresets.v1';
let customPresets=[];
function normalizePresetData(data){
  const out=deepCopy(defaults); if(!data||typeof data!=='object')return out;
  Object.keys(defs).forEach(k=>{const v=Number(data[k]);if(Number.isFinite(v))out[k]=clamp(v,defs[k].min,defs[k].max);});
  if(Array.isArray(data.curve)&&data.curve.length===5)out.curve=data.curve.map(v=>clamp(Number(v)||0,0,1));
  if(data.hsl&&typeof data.hsl==='object'){
    ['hue','sat','lum'].forEach(m=>{if(Array.isArray(data.hsl[m])&&data.hsl[m].length===8)out.hsl[m]=data.hsl[m].map(v=>clamp(Number(v)||0,-100,100));});
  }
  return out;
}
function loadCustomPresets(){
  try{
    const raw=JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY)||'[]');
    customPresets=Array.isArray(raw)?raw.filter(p=>p&&p.id&&p.name&&p.params).map(p=>({...p,params:normalizePresetData(p.params)})):[];
  }catch(e){customPresets=[];console.warn('Không đọc được preset đã lưu',e);}
}
function persistCustomPresets(){
  try{localStorage.setItem(PRESET_STORAGE_KEY,JSON.stringify(customPresets));return true;}
  catch(e){setStatus('Không thể lưu preset trong trình duyệt: '+e.message,true);return false;}
}
function populatePresetSelect(selected='builtin:neutral'){
  const sel=$('#presetSelect'); if(!sel)return;
  sel.innerHTML='';
  const built=document.createElement('optgroup');built.label='Preset có sẵn';
  Object.entries(presetLabels).forEach(([id,label])=>{const o=document.createElement('option');o.value='builtin:'+id;o.textContent=label;built.appendChild(o);});
  sel.appendChild(built);
  if(customPresets.length){
    const custom=document.createElement('optgroup');custom.label='Preset của tôi';
    customPresets.forEach(p=>{const o=document.createElement('option');o.value='custom:'+p.id;o.textContent=p.name;custom.appendChild(o);});
    sel.appendChild(custom);
  }
  const exists=[...sel.options].some(o=>o.value===selected);sel.value=exists?selected:'builtin:neutral';
  updateDeletePresetButton();
}
function applyPresetValue(value){
  if(value.startsWith('custom:')){
    const item=customPresets.find(p=>p.id===value.slice(7));
    if(!item){setStatus('Preset đã lưu không còn tồn tại.',true);return;}
    params=normalizePresetData(item.params);
    refreshControls();commitHistory();setStatus(`Đã áp dụng preset “${item.name}”.`);return;
  }
  const id=value.replace(/^builtin:/,'');
  params=deepCopy(defaults);Object.assign(params,deepCopy(presets[id]||{}));refreshControls();commitHistory();setStatus(`Đã áp dụng preset ${presetLabels[id]||id}.`);
}
function saveCurrentPreset(){
  const suggested=`Preset màu ${customPresets.length+1}`;
  let name=window.prompt('Nhập tên preset muốn lưu:',suggested);if(name===null)return;name=name.trim();
  if(!name){setStatus('Tên preset không được để trống.',true);return;}
  const existing=customPresets.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());
  let id;
  if(existing){
    if(!window.confirm(`Preset “${name}” đã tồn tại. Bạn có muốn ghi đè không?`))return;
    existing.params=deepCopy(params);existing.updatedAt=Date.now();id=existing.id;
  }else{
    id=`preset_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    customPresets.push({id,name,params:deepCopy(params),createdAt:Date.now(),updatedAt:Date.now()});
  }
  if(!persistCustomPresets())return;
  populatePresetSelect('custom:'+id);setStatus(`Đã lưu preset “${name}” để dùng cho những lần sau.`);
}
function deleteSelectedPreset(){
  const sel=$('#presetSelect');const value=sel?.value||'';
  if(!value.startsWith('custom:')){setStatus('Preset mặc định không thể xóa.',true);return;}
  const id=value.slice(7),item=customPresets.find(p=>p.id===id);if(!item)return;
  if(!window.confirm(`Xóa preset “${item.name}”?`))return;
  customPresets=customPresets.filter(p=>p.id!==id);if(!persistCustomPresets())return;
  populatePresetSelect('builtin:neutral');setStatus(`Đã xóa preset “${item.name}”.`);
}
function updateDeletePresetButton(){const b=$('#btnDeletePreset'),s=$('#presetSelect');if(b)b.disabled=!s?.value?.startsWith('custom:');}
function resetGroup(g){if(g==='mixer'){params.hsl=deepCopy(defaults.hsl)}else groups[g]?.forEach(k=>params[k]=defaults[k]);refreshControls();commitHistory();}

// Curve editor
const curveCanvas=$('#curveCanvas'),cctx=curveCanvas.getContext('2d');let dragPoint=-1;
function drawCurve(){const w=curveCanvas.width,h=curveCanvas.height;cctx.clearRect(0,0,w,h);cctx.fillStyle='#1b1b1b';cctx.fillRect(0,0,w,h);cctx.strokeStyle='#3e3e3e';cctx.lineWidth=1;for(let i=0;i<=4;i++){const x=i*w/4,y=i*h/4;cctx.beginPath();cctx.moveTo(x,0);cctx.lineTo(x,h);cctx.stroke();cctx.beginPath();cctx.moveTo(0,y);cctx.lineTo(w,y);cctx.stroke()}cctx.strokeStyle='#777';cctx.beginPath();cctx.moveTo(0,h);cctx.lineTo(w,0);cctx.stroke();cctx.strokeStyle='#ddd';cctx.lineWidth=2;cctx.beginPath();params.curve.forEach((v,i)=>{const x=i*w/4,y=h-v*h;i?cctx.lineTo(x,y):cctx.moveTo(x,y)});cctx.stroke();params.curve.forEach((v,i)=>{const x=i*w/4,y=h-v*h;cctx.fillStyle=i===dragPoint?'#31a8ff':'#ddd';cctx.beginPath();cctx.arc(x,y,6,0,Math.PI*2);cctx.fill();});}
function curvePointer(e){const r=curveCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*curveCanvas.width/r.width,y:(e.clientY-r.top)*curveCanvas.height/r.height}}
curveCanvas.addEventListener('pointerdown',e=>{const p=curvePointer(e);let best=99;params.curve.forEach((v,i)=>{const dx=p.x-i*curveCanvas.width/4,dy=p.y-(curveCanvas.height-v*curveCanvas.height),d=Math.hypot(dx,dy);if(d<best){best=d;dragPoint=i}});curveCanvas.setPointerCapture(e.pointerId);drawCurve()});
curveCanvas.addEventListener('pointermove',e=>{if(dragPoint<0)return;const p=curvePointer(e);let v=clamp(1-p.y/curveCanvas.height,0,1);if(dragPoint>0)v=Math.max(v,params.curve[dragPoint-1]);if(dragPoint<4)v=Math.min(v,params.curve[dragPoint+1]);params.curve[dragPoint]=v;drawCurve();queueRender()});
curveCanvas.addEventListener('pointerup',()=>{if(dragPoint>=0){dragPoint=-1;drawCurve();commitHistory()}});

function wireUI(){
  $$('.tab').forEach(b=>b.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.tab));}));
  $$('.subtab').forEach(b=>b.addEventListener('click',()=>{$$('.subtab').forEach(x=>x.classList.toggle('active',x===b));hslMode=b.dataset.hsl;buildHsl()}));
  $$('[data-reset-group]').forEach(b=>b.addEventListener('click',()=>resetGroup(b.dataset.resetGroup)));
  $('#resetCurve').addEventListener('click',()=>{params.curve=deepCopy(defaults.curve);drawCurve();queueRender();commitHistory()});
  $('#btnPhotopea').addEventListener('click',requestFromPhotopea);$('#btnApply').addEventListener('click',applyToPhotopea);
  const windowBtn=$('#btnWindow');
  if(windowBtn) windowBtn.addEventListener('click',e=>{
    if(isPopup){e.preventDefault();window.close();return;}
    e.preventDefault();
    const popupUrl=new URL(location.href);
    popupUrl.searchParams.set('popup','1');
    popupUrl.searchParams.set('v','2.1.6');
    popupRef=window.open(popupUrl.href,'CameraRawStudio','popup=yes,width=1400,height=900,resizable=yes,scrollbars=yes');
    if(!popupRef){
      setStatus('Trình duyệt đã chặn pop-up. Đang thử mở trong tab mới…',true);
      popupRef=window.open(popupUrl.href,'_blank');
    }
    if(popupRef){
      try{popupRef.focus();}catch{}
      setStatus('Đã mở Camera Raw Studio trong cửa sổ lớn. Giữ panel plugin này mở để kết nối với Photopea.');
    }else setStatus('Không thể mở cửa sổ. Hãy cho phép pop-up cho Photopea rồi thử lại.',true);
  });
  $('#btnDownload').addEventListener('click',downloadPNG);
  $('#fileInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f){sourceMeta=null;loadBitmapFromBlob(f,f.name,false)}e.target.value=''});
  $('#btnReset').addEventListener('click',()=>{params=deepCopy(defaults);refreshControls();commitHistory()});$('#btnUndo').addEventListener('click',undo);$('#btnRedo').addEventListener('click',redo);
  $('#presetSelect').addEventListener('change',e=>{applyPresetValue(e.target.value);updateDeletePresetButton();});
  $('#btnSavePreset').addEventListener('click',saveCurrentPreset);$('#btnDeletePreset').addEventListener('click',deleteSelectedPreset);
  $('#btnFit').addEventListener('click',()=>{previewScaleMode='fit';render()});$('#btn100').addEventListener('click',()=>{previewScaleMode='100';render()});
  const before=$('#btnBefore');before.addEventListener('pointerdown',()=>{beforeDown=true;render(true)});['pointerup','pointerleave','pointercancel'].forEach(ev=>before.addEventListener(ev,()=>{beforeDown=false;render(false)}));
  window.addEventListener('resize',debounce(()=>render(),120));
  window.addEventListener('storage',e=>{if(e.key===PRESET_STORAGE_KEY){const current=$('#presetSelect')?.value||'builtin:neutral';loadCustomPresets();populatePresetSelect(current);}});
}

try{initGL();loadCustomPresets();populatePresetSelect();buildControls();wireUI();const windowBtn=$('#btnWindow');if(isPopup&&windowBtn){windowBtn.innerHTML='<span class="window-icon">✕</span><span class="window-copy"><strong>Đóng cửa sổ lớn</strong><small>Quay lại panel Photopea</small></span>';windowBtn.title='Đóng cửa sổ Camera Raw Studio';}drawCurve();updateUndoButtons();setStatus(`Sẵn sàng • WebGL2 • v2.1.6 • giới hạn ${maxTextureSize}px`);}catch(e){setStatus(e.message,true);console.error(e);alert(e.message)}
