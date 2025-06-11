'use strict';

// http://dgd.service.tu-berlin.de/wordpress/ddg2016/2016/05/24/tutorial-5-lawsons-minimal-surfaces-and-the-sudanese-mobius-band/
let canvas, engine, scene, camera;
let slider, slider2;

// inizializzo Babylon
window.addEventListener('DOMContentLoaded', () => {
    // il tag canvas che visualizza l'animazione
    canvas = document.getElementById('renderCanvas');
    // la rotella del mouse serve per fare zoom e non per scrollare la pagina
    canvas.addEventListener('wheel', evt => evt.preventDefault());
    
    // engine & scene
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    
    // camera
    camera = new BABYLON.ArcRotateCamera('cam', 
        -4.297, 2.269,
            6, 
            new BABYLON.Vector3(0,0,0), 
            scene);
    camera.attachControl(canvas,true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 100;            
    
    // luce
    let light1 = new BABYLON.PointLight('light1',new BABYLON.Vector3(0,1,0), scene);
    light1.parent = camera;
    
    // aggiungo i vari oggetti
    populateScene(scene);
    
    // createControls();

    // main loop
    engine.runRenderLoop(()=>scene.render());

    // resize event
    window.addEventListener("resize", () => engine.resize());
});

let param1 = 0.0, param2 = 1.0;

function createControls() {

    slider2 = document.createElement('input');
    slider2.type = 'range';
    slider2.min = '0';
    slider2.max = '1';
    slider2.step = '0.01';
    slider2.value = '0.1';
    slider2.style.position = 'absolute';
    slider2.style.top = '50px';
    slider2.style.left = '10px';
    slider2.style.width = '400px';
    document.body.appendChild(slider2);

    slider2.addEventListener('input', (event) => {
        //surface.param2 = parseFloat(event.target.value);
        //surface.updateMesh();
        update(parseFloat(event.target.value))
    });
}

//
// Math details
// 
class SrfFun {
    constructor(n, m) {
        this.n = n;
        this.m = m;
        this.q = new BABYLON.Quaternion();
        this.rot = new BABYLON.Quaternion(1,1,1,0.5).normalizeToNew();
        this.build();
        this.param = 0.0;
        this.param2 = 0.0;
    }

    build() {
        // vv[] contains a sequence of points along the midline of the strip.
        // the points parameters are evenly spaced in t.
        // note: the last and the first points coincide
        let n = this.n * 3;
        let vv = [{t:0.0, p:this.f0(0.0, 0.0), len:0.0, u:0.0}];
        for(let i=1; i<n; i++) {
            let t = i/(n-1);
            let p = this.f0(0.0, t);
            let dist = BABYLON.Vector3.Distance(vv[i-1].p, p);
            let len = vv[i-1].len + dist;
            vv.push({t, p, len, u:0.0});
        }
        let length = vv[n-1].len;
        // tt[] contains a sequence of parameters such that the points are evenly spaced along the midline of the strip.
        // note: tt will contains this.n + 1 elements
        let tt = this.tt = [];
        tt.push(0.0);
        let j = 0;
        for(let i=1; i< this.n; i++) {
            let len = length * i / this.n;
            while(vv[j+1].len <= len) j++;
            // vv[j].len <= len < vv[j+1].len 
            let t = vv[j].t + (vv[j+1].t - vv[j].t) * (len - vv[j].len) / (vv[j+1].len - vv[j].len);
            tt.push(t);
        }
        tt.push(1.0);

        // the skeleton follows the strip midline. For each point it has the three versors 
        // e0: along the midline, e1: perpendicular to e0, on the strip, e1: normal to the strip
        let skeleton = this.skeleton = [];
        for(let i=0; i<=this.n; i++) {
            let t = tt[i];
            let p = this.f0(0.0, t);
            let eps = 0.001;
            let e0 = this.f0(0.0, t+eps).subtract(this.f0(0, t-eps)).normalize();
            let e1 = this.f0(eps, t).subtract(this.f0(-eps, t));
            e1 = e1.subtract(e0.scale(BABYLON.Vector3.Dot(e1, e0))).normalize();
            let e2 = BABYLON.Vector3.Cross(e0, e1).normalize();
            let phi = t * Math.PI * 2;
            let csPhi = Math.cos(phi);
            let snPhi = Math.sin(phi);  
            let csPhi2 = Math.cos(phi/2);
            let snPhi2 = Math.sin(phi/2);
            skeleton.push({p, e0, e1, e2, phi, csPhi, snPhi, csPhi2, snPhi2});
        }
    }

    // original sudanese moebius function; (s,t) -> (x,y,z); s in [-1,1], t in [0,1]
    f0(s,t) {
        let theta = s * Math.PI * 0.5;
        let phi = t * Math.PI*2;
        let q = this.q;
        let csTheta = Math.cos(theta);
        let snTheta = Math.sin(theta);
        q.x = csTheta*Math.cos(phi)
        q.y = csTheta*Math.sin(phi)
        q.z = snTheta*Math.cos(phi/2)
        q.w = snTheta*Math.sin(phi/2)
        q.multiplyInPlace(this.rot);
        let factor = 1/(1-q.w);
        return new BABYLON.Vector3( q.x*factor, q.y*factor,q.z*factor);
    }   

    // as f0, but uses the data saved in the skeleton; s in [-1,1], i (integer) in [0,this.n+1]
    f1(s,i) {
        let data = this.skeleton[i];
        let theta = s * Math.PI * 0.5;
        let csTheta = Math.cos(theta);
        let snTheta = Math.sin(theta);
        let q = this.q;
        q.x = csTheta*data.csPhi;
        q.y = csTheta*data.snPhi;
        q.z = snTheta*data.csPhi2;
        q.w = snTheta*data.snPhi2;
        q.multiplyInPlace(this.rot);
        let factor = 1/(1-q.w);
        return new BABYLON.Vector3( q.x*factor, q.y*factor,q.z*factor);
    }   

    // final function that morph the surface from simple strip to nail
    // i,j are integer; j in [0,this.m-1], i in [0,this.n]
    // note fun(j,0) == fun(this.m-1-j,this.n)
    fun(j, i) {
        let delta_i = Math.floor(this.param2);
        let i1 = (i + delta_i) % this.n;
        let sgn = 1.0; if(i + delta_i >= this.n) sgn = -1.0;
        // Math.floor(this.param2)) % (this.n+1);
        let s = (-1 + 2 * j / (this.m-1)) * sgn;

        let data = this.skeleton[i1];
        let p1 = data.p.add(data.e1.scale(0.5 * s));
        let p2 = this.f1(s * this.param,i1);
        return BABYLON.Vector3.Lerp(p1, p2, this.param);
    }

    getBorderPts() {
        
        let pts = [];
        for(let i=0; i<this.n-1; i++) 
            pts.push(this.fun(0, i));
        for(let i=0; i<=this.n; i++) 
            pts.push(this.fun(this.m-1, i));
        return pts;        
    }
}



//
// MoebiusSurface with mesh and border
//

class MoebiusSurface {

    constructor(scene) {
        this.param = 0.0;
        this.srfFun = new SrfFun(128, 128);
        this.scene = scene;
        this.nu = this.srfFun.n;
        this.nv = this.srfFun.m;
        this.tubeRadius = 0.02;
        
        this.mesh = new BABYLON.Mesh("surface", scene);
        this.computeUvs();
        this.computeIndices();
        this.computeVertices();
        

        const vertexData = new BABYLON.VertexData();
        vertexData.positions = this.positions;
        vertexData.indices = this.indices;
        vertexData.normals = this.normals;
        vertexData.uvs = this.uvs;
        vertexData.applyToMesh(this.mesh, true);
        
        let material = this.mesh.material = new BABYLON.StandardMaterial("mat", scene);
        material.twoSidedLighting = true;
        material.diffuseColor = new BABYLON.Color3(1,1,1);
        material.specularColor = new BABYLON.Color3(.5,.5,.5);
        
        material.backFaceCulling = false;
        this.createTexture();

        
        let tube = this.tube = BABYLON.MeshBuilder.CreateTube("tube", {
            path: this.srfFun.getBorderPts(),
            radius: this.tubeRadius,
            updatable: true
        }, scene);
        tube.material = new BABYLON.StandardMaterial("tubeMat", scene);
        tube.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.7);
        tube.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        this.pivot = new BABYLON.TransformNode("pivot", scene);
        this.mesh.parent = this.pivot;
        this.tube.parent = this.pivot;

        /*
        const r = 0.025;
        const inc = Math.floor(this.nv / 16);

        for(let i=0; i<this.nu; i+=inc) {
            let dot = BABYLON.MeshBuilder.CreateSphere("dot", {diameter: r*2}, scene);
            dot.position.copyFrom(this.srfFun.fun(0, i));
            dot.parent = this.pivot;
            dot.material = new BABYLON.StandardMaterial("dotMat", scene);
            dot.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            let dot2 = BABYLON.MeshBuilder.CreateSphere("dot", {diameter: r*2}, scene);
            dot2.position.copyFrom(this.srfFun.fun(this.srfFun.m-1, i));
            dot2.parent = this.pivot;
        }
            */

        
        this.place();
    }

    computeUvs() {
        let uvs = this.uvs = [];
        for(let i=0; i<=this.nu; i++) {
            for(let j=0; j<this.nv; j++) {
                let u = i/this.nu;  
                let v = j/(this.nv-1);
                uvs.push(u, v);
            }
        }
    }

    computeIndices() {
        let indices = this.indices = [];
        for (let i = 0; i + 1 <= this.nu; i++) {
            for (let j = 0; j + 1 < this.nv; j++) {
                const idx1 = i * this.nv + j;
                const idx2 = idx1 + 1;
                const idx3 = idx1 + this.nv;
                const idx4 = idx3 + 1;
                indices.push(idx1, idx2, idx3);
                indices.push(idx2, idx4, idx3);
            }
        }        
    }

    computeVertices() {
        let positions = this.positions = [];
        let normals = this.normals = [];
    
        for(let i=0; i<=this.nu; i++) {
            for(let j=0; j<this.nv; j++) {
                let p = this.srfFun.fun(j, i);
                positions.push(p.x, p.y, p.z);                
            }
        }
        BABYLON.VertexData.ComputeNormals(positions, this.indices, normals);
    }

    updateMesh() {
        let start = performance.now();
        this.computeVertices();
        
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, this.positions);
        this.mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, this.normals);

        
        BABYLON.MeshBuilder.CreateTube("tube", {
            path: this.srfFun.getBorderPts(),
            instance: this.tube
        });
        
    }

    updateIndices(alternate = false) {
        let indices = [];
        let d = Math.floor(this.nu / 32);
        for (let i = 0; i + 1 <= this.nu; i++) {
            if(alternate && Math.floor(i/d)%2==0) continue;
            
            for (let j = 0; j + 1 < this.nv; j++) {
                const idx1 = i * this.nv + j;
                const idx2 = idx1 + 1;
                const idx3 = idx1 + this.nv;
                const idx4 = idx3 + 1;
                indices.push(idx1, idx2, idx3);
                indices.push(idx2, idx4, idx3);
            }
        }  
        this.mesh.updateIndices(indices);
    }

    place() {

        let p0 = this.srfFun.f1(0.0, 0);
        let p1 = this.srfFun.f1(0.0, this.srfFun.n/2);
        let p2 = this.srfFun.f1(0.0, this.srfFun.n/4);
        let center = BABYLON.Vector3.Lerp(p0, p1, 0.5);  
        let e0 = p1.subtract(p0).normalize();
        let e1 = p2.subtract(center);
        e1 = e1.subtract(e0.scale(BABYLON.Vector3.Dot(e1, e0))).normalize();
        let e2 = BABYLON.Vector3.Cross(e0, e1).normalize();
        let rotationMatrix = BABYLON.Matrix.FromValues(
                e0.x, e1.x, e2.x, 0,
                e0.y, e1.y, e2.y, 0,
                e0.z, e1.z, e2.z, 0,
                0, 0, 0, 1
        );
        let rotatedCenter = BABYLON.Vector3.TransformCoordinates(center.negate(), rotationMatrix);
    
        this.pivot.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        this.pivot.position.copyFrom(rotatedCenter);

        /*
        [p0,p1,p2,center].forEach(p => {
            let dot = BABYLON.MeshBuilder.CreateSphere("ball", {diameter: 0.1}, this.scene);
            dot.position.copyFrom(p);
            dot.parent = this.pivot;
        });
        */
    }

    createTexture() {
        
        // Create a dynamic texture for the checkerboard pattern
        const textureSize = this.textureSize = 1024;
        const dynamicTexture = this.dynamicTexture = new BABYLON.DynamicTexture("dynamicTexture", { 
            width: textureSize, 
            height: textureSize,
        }, scene, true);
        dynamicTexture.hasAlpha = true; // Enable alpha channel
        this.drawTextureA();
        
        dynamicTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        dynamicTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    
        // Apply the dynamic texture to the material
        this.mesh.material.diffuseTexture = dynamicTexture;
    }

    drawTextureA() {
        const context = this.dynamicTexture.getContext();
        // Set texture wrap mode to repeat
        // Draw the checkerboard pattern
        const ni = 16, nj = 5;
        const di = this.textureSize/ni, dj = this.textureSize/nj;
        for (let i = 0; i < ni; i++) {
            for (let j = 0; j < nj; j++) {
                context.fillStyle = (i + j) % 2 === 0 ? "cyan" : "magenta";
                context.fillRect(i * di, j * dj, di, dj);
            }
        }
        this.dynamicTexture.update();
    }
    drawTextureB() {
        const context = this.dynamicTexture.getContext();
        // Set texture wrap mode to repeat
        // Draw the checkerboard pattern
        context.fillStyle = "yellow"; // Set the background color to white
        // context.clearRect(0, 0, this.textureSize, this.textureSize); // Clear the canvas
        context.fillRect(0, 0, this.textureSize, this.textureSize); // Clear the canvas
        
        const ni = 32, nj = 5;
        const di = this.textureSize/ni, dj = this.textureSize/nj;

        context.fillStyle = "magenta";
        context.fillRect(this.textureSize - di, 0, di, this.textureSize); // Clear the canvas

        context.fillStyle = "black";
        
        
        let d = di / 3;
        // const di = this.textureSize/ni, dj = this.textureSize/nj;
        for (let i = 0; i <= ni; i++) {
            // for (let j = 0; j < nj; j++) {
            let x0 = i * di - d/2;
            let x1 = x0 + d;
            x0 = Math.max(0.0, x0);
            context.fillStyle = "black";
        
            context.fillRect(x0, 0, x1-x0, this.textureSize);
           // }
        }
        this.dynamicTexture.update();
    }

    drawTextureC() {
        this.dynamicTexture.hasAlpha = true;
        const context = this.dynamicTexture.getContext();
        // Set texture wrap mode to repeat
        // Draw the checkerboard pattern
        context.clearRect(0, 0, this.textureSize, this.textureSize); // Clear the canvas
        //context.fillStyle = "rgba(0,0,0,0)"; // Set the background color to white
        // context.clearRect(0, 0, this.textureSize, this.textureSize); // Clear the canvas
        //context.fillRect(0, 0, this.textureSize, this.textureSize); // Clear the canvas

        context.fillStyle = "red"; // Set the background color to white
        let n = 5;
        let sz = this.textureSize;
        let d = sz/(2*n-1)
        for(let i=0;i<n;i++) {           
            context.fillRect(0, i*2*d, sz, d);
        }
        context.fillStyle = "black"; // Set the background color to white
        let mrg = d*0.125;
        for(let i=0;i<n;i++) {           
            let y0 = i*2*d, y1 = y0+d;
            context.fillRect(0,y0, sz, mrg);
            context.fillRect(0,y1-mrg, sz, mrg);

        }
        let w = sz/32;
        mrg = w*0.125;
        context.fillStyle="yellow";
        context.fillRect(0,0,w,sz);
        context.fillStyle="black";
        context.fillRect(0,0,mrg,sz);
        context.fillRect(w-mrg,0,mrg,sz);

        this.dynamicTexture.update();
    }

    setMode(mode) {
        if(mode==0) {
            this.drawTextureA();
            this.updateIndices(false);
            this.mesh.isVisible = true;
        } else if(mode==1) {
            this.drawTextureB();
            this.updateIndices(true);
            this.mesh.isVisible = true;
        } else if(mode==2) {
            // this.drawTextureA();
            this.updateIndices(false);
            this.mesh.isVisible = false;
        } else if(mode==3) {
            this.drawTextureC();
            this.updateIndices(false);
            this.mesh.isVisible = true;
        }
    }

    setParam1(value) {        
        this.srfFun.param = value;
        this.updateMesh();
    }
    setParam2(value) {        
        this.srfFun.param2 = value * (this.srfFun.n-1);
        this.updateMesh();
    }
}


let surface;
let skysphere;

function createGroundTexture(scene, ground) {
    // Dimensione della texture
    const textureSize = 512;

    // Crea una DynamicTexture
    const groundTexture = new BABYLON.DynamicTexture("groundTexture", { width: textureSize, height: textureSize }, scene);

    // Ottieni il contesto 2D della texture
    const context = groundTexture.getContext();

    // Colori per i vertici
    const topLeftColor = "#5566aa";       // Colore in alto a sinistra
    const topRightColor = "#aaaaaa";     // Colore in alto a destra
    const bottomLeftColor = "#dddddd";  // Colore in basso a sinistra
    const bottomRightColor = "#5566aa"; // Colore in basso a destra

    // Crea un gradiente lineare
    const gradient = context.createLinearGradient(0, 0, textureSize, textureSize);

    // Aggiungi i colori al gradiente
    gradient.addColorStop(0, topLeftColor);       // In alto a sinistra
    gradient.addColorStop(0.33, topRightColor);   // In alto a destra
    gradient.addColorStop(0.66, bottomLeftColor); // In basso a sinistra
    gradient.addColorStop(1, bottomRightColor);   // In basso a destra

    // Riempie la texture con il gradiente
    context.fillStyle = gradient;
    context.fillRect(0, 0, textureSize, textureSize);

    // Aggiorna la DynamicTexture
    groundTexture.update();

    // Applica la texture al materiale del ground
    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor.set(0.9,0.9,0.9)
    groundMaterial.diffuseTexture = groundTexture;
    groundMaterial.specularColor.set(0.1,0.1,0.1);
    ground.material = groundMaterial;
}

function populateScene(scene) {

    // createGrid(scene);

    surface = new MoebiusSurface(scene);
    //material.alpha = 0.5;

    
    let ground = BABYLON.MeshBuilder.CreatePlane("ground", {width: 50, height: 40}, scene);
    ground.parent = camera; 
    ground.position.z = 30;
    ground.rotation.x = 0
    
    createGroundTexture(scene, ground);

    
    createGUI(scene)
}


let gui, guiMainPanel;

function createGUI(scene) {
    // Crea un AdvancedDynamicTexture per la GUI
    gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Crea un pannello per contenere gli elementi della GUI
    guiMainPanel = new BABYLON.GUI.StackPanel();
    guiMainPanel.left = "10px"; // Posizione verticale esplicita
    guiMainPanel.top = "10px"; // Posizione verticale esplicita
    guiMainPanel.width = "220px"; // Posizione orizzontale esplicita
    guiMainPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    guiMainPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    
    gui.addControl(guiMainPanel);
    let panel = guiMainPanel;

    let mainSlider = new Slider("mainSlider");
    mainSlider.onChange = function(value) { surface.setParam1(value); }
    panel.addControl(mainSlider)

    let roundSlider = new RoundSlider("roundSlider");
    roundSlider.onChange = function(value) { surface.setParam2(value); }
    panel.addControl(roundSlider);
    
    let radioButtons = new RadioButtonsGroup("r", [
        {label:"Scacchiera", mode:0},
        {label:"Meridiani", mode:1},
        {label:"Paralleli", mode:3},
        {label:"Solo bordo", mode:2},
        
    ])
    radioButtons.onChange = function(option) {
        surface.setMode(option.mode);
    }
    panel.addControl(radioButtons)
   


}