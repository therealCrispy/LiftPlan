export const DAY_LABELS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const TYPE_LABELS={upper:'Upper',lower:'Lower',push:'Push',pull:'Pull',legs:'Legs',full1:'Full Body A',full2:'Full Body B',full3:'Full Body C',rest:'Recovery'};
export function localDay(date=new Date()) { const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function parseDay(value){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12);}
export function addDays(value,days){const d=parseDay(value);d.setDate(d.getDate()+days);return localDay(d);}
export function dayNumber(value){const [y,m,d]=value.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;}
export function monday(value=localDay()){const dow=parseDay(value).getDay();return addDays(value,-((dow+6)%7));}
export function programWeek(start,today=localDay()){if(!start)return 1;const diff=dayNumber(today)-dayNumber(start);return diff<0?1:Math.floor(diff/7)%12+1;}
export function blockForWeek(program,week){return program.find(b=>b.weeks.includes(week))||program[0];}
export function parseReps(value){const m=String(value).match(/(\d+)(?:\s*[-–]\s*(\d+))?/);return m?{min:+m[1],max:+(m[2]||m[1])}:{min:null,max:null};}
export function e1rm(weight,reps){return weight>0&&reps>0&&reps<=12?Math.round(weight*(1+reps/30)):null;}
export function validSet(weight,reps){return Number.isFinite(weight)&&weight>=0&&weight<=2000&&Number.isInteger(reps)&&reps>0&&reps<=200;}
export function secondsLeft(deadline,now=Date.now()){return Math.max(0,Math.ceil((deadline-now)/1000));}
export function formatTime(seconds){const s=Math.max(0,Math.floor(seconds));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export function formatDate(value,options={month:'short',day:'numeric'}){return parseDay(value).toLocaleDateString('en-US',options);}
export function buildSteps(exercises){
 const steps=[],used=new Set();
 const build=(ex,ei)=>{
  const base=Array.from({length:ex.sets},(_,i)=>({id:`${ei}:work:${i}`,exerciseIndex:ei,name:ex.n,type:'working',target:ex.reps,rest:ex.rest??90,round:i+1,loadMode:ex.loadMode||'total',note:ex.note||'',warmups:ex.wu||0}));
  for(let i=0;i<(ex.bo?.sets||0);i++)base.push({id:`${ei}:back:${i}`,exerciseIndex:ei,name:ex.n,type:'backoff',target:ex.bo.reps,rest:ex.rest??90,round:i+1,loadMode:ex.loadMode||'total',note:ex.note||'',warmups:0});
  if(ex.drop&&base.length){const last=base[base.length-1];last.rest=0;last.hasDrop=true;base.push({...last,id:`${ei}:drop:0`,type:'drop',target:'As many as possible',rest:ex.rest??90,hasDrop:false,warmups:0});}
  return base;
 };
 exercises.forEach((ex,i)=>{
  if(used.has(i))return;used.add(i);
  const a=build(ex,i),pair=ex.ss?exercises.findIndex((x,j)=>j>i&&x.n===ex.ss&&!used.has(j)):-1;
  if(pair<0){steps.push(...a);return;}used.add(pair);const b=build(exercises[pair],pair);
  for(let r=0;r<Math.max(a.length,b.length);r++){
   if(a[r])steps.push({...a[r],rest:b[r]?0:a[r].rest,superset:exercises[pair].n});
   if(b[r])steps.push({...b[r],superset:ex.n});
  }
 });return steps;
}
export function lastExerciseSession(logs,name){return [...logs].filter(l=>!l.deleted&&l.sets?.some(s=>s.name===name)).sort((a,b)=>b.startedAt-a.startedAt)[0];}
export function suggestion(logs,step,currentSets=[],increment=2.5){
 if(step.type==='drop'){const set=[...currentSets].reverse().find(s=>s.name===step.name&&s.type!=='drop'&&s.done);return set?{weight:Math.floor(set.weight*0.5/2.5)*2.5,text:'Half of the set you just logged'}:null;}
 const last=lastExerciseSession(logs,step.name);if(!last)return null;
 const same=last.sets.filter(s=>s.name===step.name&&s.type===step.type&&s.done);
 if(!same.length)return null;
 const set=same.find(s=>s.round===step.round)||same[0],range=parseReps(step.target);
 const allHitTop=range.max&&same.every(s=>s.reps>=range.max);
 const allBelow=range.min&&same.every(s=>s.reps<range.min);
 const delta=allHitTop?increment:allBelow?-increment:0;
 return {weight:Math.max(0,set.weight+delta),text:delta>0?`All previous ${step.type} sets hit ${range.max} reps · +${increment} lb`:delta<0?'Previous sets were below target · a little lighter':`Last session: ${set.weight} lb × ${set.reps}`};
}
export function completedSets(draft){return draft.steps.filter(s=>s.done&&validSet(s.weight,s.reps));}
export function workoutVolume(log){return (log.sets||[]).reduce((sum,s)=>sum+s.weight*s.reps,0);}
export function summarizeExercise(logs,name){
 const points=[...logs].sort((a,b)=>a.startedAt-b.startedAt).flatMap(log=>{
  const sets=log.sets.filter(s=>s.name===name&&s.done&&s.weight>0&&s.type!=='drop');
  if(!sets.length)return [];const scores=sets.map(s=>e1rm(s.weight,s.reps)).filter(Boolean);
  return [{date:log.date,weight:Math.max(...sets.map(s=>s.weight)),e1rm:scores.length?Math.max(...scores):null}];
 });return {points,bestWeight:points.length?Math.max(...points.map(p=>p.weight)):0,bestE1rm:Math.max(0,...points.map(p=>p.e1rm||0))};
}
