/**
 * Ant colony optimization. Ants choose routes using pheromone strength and distance; evaporation and deposits guide later iterations.
 */
import {createColony,iterate,sampleAnt} from './colony.mjs';
const canvas=document.getElementById('colony-map'),ctx=canvas.getContext('2d');
const play=document.getElementById('play'),step=document.getElementById('step'),status=document.getElementById('colony-status');
const palette=getComputedStyle(document.documentElement),
/**
 * Read a named color from the shared CSS palette.
 *
 * @param name - CSS custom-property name or display label used by this operation.
 * @returns CSS color string from the shared palette.
 */
color=name=>palette.getPropertyValue(name).trim();
/**
 * Read a control value as a number for the simulation settings.
 *
 * @param id - DOM element identifier used to find its control or canvas.
 * @returns Numeric value read from the control.
 */
const value=id=>Number(document.getElementById(id).value);
let colony,points=[],running=false,accumulator=0,last=0,phase=0,initial=null,dirty=true;
for(const id of ['points','ants','evaporation','alpha','beta','speed'])document.getElementById(id).addEventListener('input',()=>{document.getElementById(`${id}-value`).value=value(id)+(id==='evaporation'?'%':'');});
/**
 * Pause simulation playback and restore the controls without discarding the current state.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function stop(){running=false;play.textContent='Start';step.disabled=false;accumulator=0;}
/**
 * Pause playback and clear colony state; New map also replaces point coordinates.
 *
 * @param newMap - Whether to replace point coordinates as well as restarting the optimizer. Default: false.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function reset(newMap=false) {
    stop();if(newMap)points=Array.from({length:value('points')},()=>({x:35+Math.random()*930,y:35+Math.random()*630}));
    colony=createColony(points);initial=null;phase=0;dirty=true;update();status.textContent='Ready. Start the colony or advance one iteration.';
}
/**
 * Refresh the iteration, best distance, improvement, and accessible map description.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function update(){
    document.getElementById('iteration').textContent=colony.iteration;
    document.getElementById('distance').textContent=colony.best?colony.best.length.toFixed(1):'—';
    document.getElementById('improvement').textContent=initial?`${((1-colony.best.length/initial)*100).toFixed(1)}%`:'—';
    canvas.setAttribute('aria-label',`Ant colony with ${points.length} points. Iteration ${colony.iteration}${colony.best?`, best route distance ${colony.best.length.toFixed(1)}`:''}.`);
}
/**
 * Run one optimization iteration using the live settings, then restart the displayed tours.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function advance(){iterate(colony,{ants:value('ants'),evaporation:value('evaporation')/100,alpha:value('alpha'),beta:value('beta')});if(initial===null)initial=colony.best.length;phase=0;dirty=true;update();}
/**
 * Draw pheromone edges, the best route, moving ants, and point labels in shared map coordinates.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function draw(){
    dirty=false;
    const width=canvas.clientWidth,height=canvas.clientHeight,ratio=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const scale=Math.min(width/1000,height/700);ctx.translate((width-scale*1000)/2,(height-scale*700)/2);ctx.scale(scale,scale);
    let strongest=.001;for(const row of colony.pheromones)for(const p of row)strongest=Math.max(strongest,p);
    for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){
        const strength=colony.pheromones[a][b]/strongest;
        if(colony.iteration && strength<.025)continue;
        ctx.strokeStyle=`rgba(101,169,237,${colony.iteration?.06+strength*.55:.06})`;ctx.lineWidth=(.5+strength*1.5)/scale;
        ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[b].x,points[b].y);ctx.stroke();
    }
    if(colony.best){ctx.strokeStyle=color('--site-accent');ctx.lineWidth=2.5/scale;ctx.beginPath();colony.best.route.forEach((id,i)=>{const p=points[id];if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.stroke();}
    for(const tour of colony.tours){const p=sampleAnt(tour,colony.distances,points,phase);ctx.fillStyle='#ffdf7c';ctx.beginPath();ctx.arc(p.x,p.y,2.7/scale,0,Math.PI*2);ctx.fill();}
    points.forEach((p,i)=>{ctx.fillStyle=color('--site-text');ctx.beginPath();ctx.arc(p.x,p.y,4/scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=color('--site-muted');ctx.font=`${10/scale}px sans-serif`;ctx.fillText(i+1,p.x+7/scale,p.y-7/scale);});
}
play.addEventListener('click',()=>{if(running){stop();status.textContent='Paused.';}else{if(!colony.iteration)advance();running=true;last=performance.now();play.textContent='Pause';step.disabled=true;status.textContent='Ants are exploring and reinforcing shorter routes…';}});
step.addEventListener('click',()=>{advance();status.textContent=`Iteration ${colony.iteration} complete.`;});
document.getElementById('colony-form').addEventListener('submit',event=>{event.preventDefault();reset(true);});
document.getElementById('reset').addEventListener('click',()=>reset());
// Recalculate view dimensions when the surrounding layout changes.
new ResizeObserver(()=>{dirty=true;}).observe(canvas);
/**
 * Advance time-dependent simulation work and redraw the view on the next animation frame.
 *
 * @param time - Animation-frame timestamp in milliseconds.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function animate(time){
    if(running){const dt=Math.min((time-last)/1000,.1);accumulator+=dt*value('speed');phase=Math.min(.999,phase+dt*value('speed'));if(accumulator>=1){accumulator-=1;advance();}dirty=true;}
    last=time;if(dirty)draw();requestAnimationFrame(animate);
}
reset(true);requestAnimationFrame(animate);
