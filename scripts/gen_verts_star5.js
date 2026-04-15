const fs=require('fs'), path=require('path');
const SvgPath=require('svgpath');

const svg=fs.readFileSync(path.join(__dirname,'ref-star5.svg'),'utf8');
const vbMatch=svg.match(/viewBox="([^"]+)"/);
const vb=vbMatch[1].split(/\s+/).map(Number);
const SVG_W=vb[2], SVG_H=vb[3];
const SC=75/SVG_H;
const OX=100-(SVG_W*SC)/2;
const OY=67.5;

function svgToShape(d){
  const norm=new SvgPath(d).abs().unshort().unarc().toString();
  const segs=norm.match(/[MLCHVZ][^MLCHVZ]*/g)||[];
  const verts=[],ins=[],outs=[];
  let cx=0,cy=0;
  for(const seg of segs){
    const type=seg[0];
    const nums=(seg.slice(1).match(/-?[\d.]+(?:e[+-]?\d+)?/g)||[]).map(Number);
    if(type==='M'){cx=nums[0];cy=nums[1];verts.push([cx*SC+OX,cy*SC+OY]);ins.push([0,0]);outs.push([0,0]);}
    else if(type==='L'){for(let i=0;i<nums.length;i+=2){cx=nums[i];cy=nums[i+1];verts.push([cx*SC+OX,cy*SC+OY]);ins.push([0,0]);outs.push([0,0]);}}
    else if(type==='H'){cx=nums[0];verts.push([cx*SC+OX,cy*SC+OY]);ins.push([0,0]);outs.push([0,0]);}
    else if(type==='V'){cy=nums[0];verts.push([cx*SC+OX,cy*SC+OY]);ins.push([0,0]);outs.push([0,0]);}
    else if(type==='C'){
      for(let i=0;i<nums.length;i+=6){
        const x1=nums[i],y1=nums[i+1],x2=nums[i+2],y2=nums[i+3],x=nums[i+4],y=nums[i+5];
        const prev=verts[verts.length-1];
        outs[outs.length-1]=[x1*SC+OX-prev[0],y1*SC+OY-prev[1]];
        cx=x;cy=y;const px=cx*SC+OX,py=cy*SC+OY;
        verts.push([px,py]);ins.push([x2*SC+OX-px,y2*SC+OY-py]);outs.push([0,0]);
      }
    }
  }
  return{v:verts,i:ins,o:outs,c:true};
}

const allPaths=[...svg.matchAll(/<path[^>]+d="([^"]+)"/g)].map(m=>m[1]);
const normFull=allPaths.map(d=>new SvgPath(d).abs().unshort().unarc().toString()).join('');
const subpaths=normFull.split(/(?=M)/).filter(Boolean);
const shapes=subpaths.map(sp=>svgToShape(sp)).filter(s=>s.v.length>=2);
shapes.forEach((s,i)=>{
  const xs=s.v.map(v=>v[0]),ys=s.v.map(v=>v[1]);
  const nan=xs.some(isNaN)||ys.some(isNaN);
  console.log(`Shape ${i+1}: ${s.v.length}v ${nan?'NaN!':'OK'} x=[${Math.min(...xs).toFixed(1)},${Math.max(...xs).toFixed(1)}] y=[${Math.min(...ys).toFixed(1)},${Math.max(...ys).toFixed(1)}]`);
});
fs.writeFileSync(path.join(__dirname,'lottie-verts-star5.json'),JSON.stringify({shapes},null,2));
console.log('Saved',shapes.length,'shapes');
