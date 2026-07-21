'use strict';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const deepCopy = o => JSON.parse(JSON.stringify(o));
const debounce = (fn,ms=80) => { let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)} };

const defs = {
  exposure:{label:'Exposure',min:-5,max:5,step:.01,group:'light'}, contrast:{label:'Contrast',min:-100,max:100,step:1,group:'light'},
  highlights:{label:'Highlights',min:-100,max:100,step:1,group:'light'}, shadows:{label:'Shadows',min:-100,max:100,step:1,group:'light'},
  whites:{label:'Whites',min:-100,max:100,step:1,group:'light'}, blacks:{label:'Blacks',min:-100,max:100,step:1,group:'light'},
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
const hslNames = ['Reds','Oranges','Yellows','Greens','Aquas','Blues','Purples','Magentas'];
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
  const d=defs[key]; const row=document.createElement('div'); row.className='control-row';
  row.innerHTML=`<label for="r_${key}">${d.label}</label><input id="r_${key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}"><input type="number" min="${d.min}" max="${d.max}" step="${d.step}">`;
  const range=$('input[type=range]',row), num=$('input[type=number]',row);
  const sync=v=>{v=clamp(Number(v)||0,d.min,d.max);valueSetter(v);range.value=v;num.value=(d.step<1?v.toFixed(2):Math.round(v));queueRender();};
  range.value=valueGetter(); num.value=valueGetter();
  range.addEventListener('input',e=>sync(e.target.value)); num.addEventListener('input',e=>sync(e.target.value));
  range.addEventListener('change',commitHistory); num.addEventListener('change',commitHistory);
  parent.appendChild(row); return {row,range,num,sync};
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
function buildHsl(){
  const root=$('#hslControls'); root.innerHTML='';
  hslNames.forEach((name,i)=>{
    const fakeKey=`hsl_${hslMode}_${i}`; const row=document.createElement('div');row.className='control-row';
    row.innerHTML=`<label>${name}</label><input type="range" min="-100" max="100" step="1"><input type="number" min="-100" max="100" step="1">`;
    const r=$('input[type=range]',row),n=$('input[type=number]',row);r.value=n.value=params.hsl[hslMode][i];
    const set=v=>{v=clamp(Number(v)||0,-100,100);params.hsl[hslMode][i]=v;r.value=n.value=Math.round(v);queueRender()};
    r.addEventListener('input',e=>set(e.target.value));n.addEventListener('input',e=>set(e.target.value));r.addEventListener('change',commitHistory);n.addEventListener('change',commitHistory);
    root.appendChild(row);
  });
}
function refreshControls(){
  Object.keys(defs).forEach(k=>{const r=$(`#r_${k}`);if(r){r.value=params[k];const n=r.nextElementSibling;n.value=defs[k].step<1?params[k].toFixed(2):Math.round(params[k]);}});
  buildHsl(); drawCurve(); updateGradeSwatches(); queueRender(); updateUndoButtons();
}
function updateGradeSwatches(){
  const vals=[['gradeShadowHue','gradeShadowSat'],['gradeMidHue','gradeMidSat'],['gradeHighHue','gradeHighSat']];
  $$('.grade-swatch').forEach((sw,i)=>{const [h,s]=vals[i];sw.style.background=`hsl(${params[h]} ${params[s]}% 50%)`;});
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
vec3 toneAdjust(vec3 c,float amount,float mask){float a=amount*mask;return a>=0.0?mix(c,vec3(1.0),a):mix(c,vec3(0.0),-a);}
void main(){
  vec2 p=vUv-.5; float r2=dot(p,p); vec2 uv=.5+p*(1.0+uDistortion*r2*.9);
  vec2 ca=p*uChromatic*.012; vec3 center=vec3(texture(uTex,uv+ca).r,texture(uTex,uv).g,texture(uTex,uv-ca).b);
  if(uBefore>.5){outColor=vec4(center,1);return;}
  vec2 t=uTexel; vec3 n1=texture(uTex,uv+vec2(t.x,0)).rgb,n2=texture(uTex,uv-vec2(t.x,0)).rgb,n3=texture(uTex,uv+vec2(0,t.y)).rgb,n4=texture(uTex,uv-vec2(0,t.y)).rgb;
  vec3 avg=(n1+n2+n3+n4)*.25; vec3 wide=(texture(uTex,uv+2.5*vec2(t.x,0)).rgb+texture(uTex,uv-2.5*vec2(t.x,0)).rgb+texture(uTex,uv+2.5*vec2(0,t.y)).rgb+texture(uTex,uv-2.5*vec2(0,t.y)).rgb)*.25;
  vec3 c=mix(center,avg,uNoise*.65); float y=lum(c); vec3 chroma=c-vec3(y); c=vec3(y)+chroma*(1.0-uColorNoise*.75);
  c += (center-avg)*(uSharpen*2.2+uTexture*.8); c += (center-wide)*uClarity*.85;
  c=mix(c,avg,uBlur*.75); c+=max(vec3(0),c-vec3(.72))*uBokeh*.35;
  c*=exp2(uExposure); c.r*=1.0+uTemperature*.22; c.b*=1.0-uTemperature*.22; c.g*=1.0-uTint*.12; c.r+=uTint*.055; c.b+=uTint*.055;
  c=(c-.5)*(1.0+uContrast*.85)+.5; y=lum(c);
  c=toneAdjust(c,uShadows*.65,1.0-smoothstep(.08,.62,y)); c=toneAdjust(c,uHighlights*.55,smoothstep(.38,.95,y));
  y=lum(c);c=toneAdjust(c,uBlacks*.45,1.0-smoothstep(.02,.38,y));c=toneAdjust(c,uWhites*.45,smoothstep(.62,.98,y));
  c=(c-.5)*(1.0+uDehaze*.45)+.5; vec3 hsl=rgb2hsl(clamp(c,0.0,1.0));
  float centers[8]=float[8](0.0,.08333,.16667,.33333,.5,.66667,.77778,.91667);float dh=0.0,ds=0.0,dl=0.0,ws=0.0;
  for(int i=0;i<8;i++){float w=pow(clamp(1.0-cd(hsl.x,centers[i])/.105,0.0,1.0),2.0);dh+=uHslHue[i]*w;ds+=uHslSat[i]*w;dl+=uHslLum[i]*w;ws+=w;}
  if(ws>0.0){hsl.x=fract(hsl.x+dh/ws*.12+1.0);hsl.y=clamp(hsl.y+ds/ws*.7,0.0,1.0);hsl.z=clamp(hsl.z+dl/ws*.55,0.0,1.0);} 
  hsl.y=clamp(hsl.y*(1.0+uSaturation)+uVibrance*(1.0-hsl.y)*.55,0.0,1.0); c=hsl2rgb(hsl); c=toneCurve(clamp(c,0.0,1.0)); y=lum(c);
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
function applyPreset(id){params=deepCopy(defaults);Object.assign(params,presets[id]||{});refreshControls();commitHistory();}
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
  $('#btnWindow').addEventListener('click',()=>{if(isPopup){window.close();return;}popupRef=window.open(location.href.split('?')[0]+'?popup=1','CameraRawStudio','popup=yes,width=1400,height=900,resizable=yes,scrollbars=yes');if(!popupRef)setStatus('Trình duyệt đã chặn cửa sổ. Hãy cho phép pop-up cho trang plugin.',true);});$('#btnDownload').addEventListener('click',downloadPNG);
  $('#fileInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f){sourceMeta=null;loadBitmapFromBlob(f,f.name,false)}e.target.value=''});
  $('#btnReset').addEventListener('click',()=>{params=deepCopy(defaults);refreshControls();commitHistory()});$('#btnUndo').addEventListener('click',undo);$('#btnRedo').addEventListener('click',redo);
  $('#presetSelect').addEventListener('change',e=>applyPreset(e.target.value));$('#btnFit').addEventListener('click',()=>{previewScaleMode='fit';render()});$('#btn100').addEventListener('click',()=>{previewScaleMode='100';render()});
  const before=$('#btnBefore');before.addEventListener('pointerdown',()=>{beforeDown=true;render(true)});['pointerup','pointerleave','pointercancel'].forEach(ev=>before.addEventListener(ev,()=>{beforeDown=false;render(false)}));
  window.addEventListener('resize',debounce(()=>render(),120));
}

try{initGL();buildControls();wireUI();if(isPopup)$('#btnWindow').textContent='Đóng cửa sổ';drawCurve();updateUndoButtons();setStatus(`Sẵn sàng • WebGL2 • giới hạn ${maxTextureSize}px`);}catch(e){setStatus(e.message,true);alert(e.message)}
