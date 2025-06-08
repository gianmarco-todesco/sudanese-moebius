
class Slider extends BABYLON.GUI.Control {
    constructor(name) {
        super(name);
        this.width = "200px";
        this.height = "30px";
        this.isPointerBlocker = true; // Per intercettare gli eventi del mouse
        this.x = 10;
        this.offset = 0;    
        this._active = false;
    }

    get active() {
        return this._active;    
    }
    set active(value) {
        if (this._active !== value) {
            this._active = value;
            this._markAsDirty();       
        }       
    }
    _draw(ctx) {
        this._applyStates(ctx);
        const {left,top,width,height} = this._currentMeasure;

        let y1 = 10, y2 = 15;
        ctx.fillStyle = "gray";
        ctx.fillRect(left,top+y1,width,y2-y1);
        ctx.strokeStyle = "black";
        
        ctx.fillStyle = this._active ? "orange" : "white";
    
        ctx.beginPath();
        let x = left + this.x;
        let y = top + (y1+y2)/2;
        ctx.moveTo(x,y);
        ctx.arc(x, y, 10, 0, 2*Math.PI);

        ctx.fill();
        /*
        ctx.beginPath();
        ctx.rect(0,y1,width,y2-y1);
        ctx.fillStyle = "white";
        ctx.fill();
        */
        /*

        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
        ctx.fillStyle = "red";
        ctx.fillRect(x0,y0,this.width/2,this.height/4)
        ctx.beginPath();
        let x = this.x + x0;
        ctx.moveTo(x,y0);
        ctx.arc(x, y0, 20, 0, 2*Math.PI);
        ctx.fill();
        */
    }

    _processMeasures(parentMeasure, context) {
        super._processMeasures(parentMeasure, context);
        // Qui puoi personalizzare ulteriormente le misure se necessario
    }

    _onPointerEnter() {

    }
    _onPointerOut() {
        this.active = false;
    }

    _onPointerDown(target, coordinates, pointerId, buttonIndex, pi) {
        if (!super._onPointerDown(target, coordinates, pointerId, buttonIndex, pi)) {
            return false;
        }
        
        this._pointerIsDown = true;
        this._host._capturingControl[pointerId] = this;
        this._lastPointerDownId = pointerId;
        this.offset = this.x - coordinates.x;
        return true;
    }
    _onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick) {
        this._pointerIsDown = false
        delete this._host._capturingControl[pointerId];
        super._onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick);        
    }
    _onPointerMove(target, coordinates, pointerId, pi) {
        // Only listen to pointer move events coming from the last pointer to click on the element (To support dual vr controller interaction)
        if (pointerId != this._lastPointerDownId || !this._pointerIsDown) {
            let x = coordinates.x - this._currentMeasure.left;
            this.active = Math.abs(x-this.x) < 10.0;

            this.highlighted
            return;
        }

        if (this._pointerIsDown && !this.isReadOnly) {
            console.log("move", coordinates);
        }
        this.x = coordinates.x + this.offset;
        this.x = Math.max(10, Math.min(this._currentMeasure.width-10, this.x));
        this._markAsDirty()
        super._onPointerMove(target, coordinates, pointerId, pi);
        if(this.onChange) {
            this.onChange((this.x - 10) / (this._currentMeasure.width - 20));
        }
    }
    _onCanvasBlur() {
        this._forcePointerUp();
        super._onCanvasBlur();
    }

}


class RoundSlider extends BABYLON.GUI.Control {
    constructor(name) {
        super(name);
        this.width = "100px";
        this.height = "100px";
        this.isPointerBlocker = true; // Per intercettare gli eventi del mouse
        this.x = 10;
        this.offset = 0;    
        this._active = false;
        this.angle = 0;
        // local coordinates
        this.center = {x: 0, y: 0};
        this.dotPosition = {x: 0, y: 0};
        this._pointerIsDown = false;
    }

    get active() {
        return this._active;    
    }
    set active(value) {
        if (this._active !== value) {
            this._active = value;
            this._markAsDirty();       
        }       
    }
    _draw(ctx) {
        this._applyStates(ctx);
        const {left,top,width,height} = this._currentMeasure;
        this.center.x = width/2;
        this.center.y = height/2;
        const outerRadius = Math.min(width, height) / 2 - 10; // Margine di 10px
        const innerRadius = outerRadius/2;
        const midRadius = (innerRadius + outerRadius) / 2;
        const dotRadius = 0.5 * (outerRadius - innerRadius);

        this.dotPosition.x = this.center.x + Math.cos(this.angle) * midRadius;
        this.dotPosition.y = this.center.y + Math.sin(this.angle) * midRadius;
            
        let cx = left + this.center.x;
        let cy = top + this.center.y;
        ctx.beginPath();
        ctx.moveTo(cx+outerRadius,cy);
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2, false);
        ctx.moveTo(cx+innerRadius,cy);
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = "gray";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 0.5;  
        ctx.stroke();
        ctx.beginPath();
        let dotx = left + this.dotPosition.x;
        let doty = top + this.dotPosition.y;  
        ctx.moveTo(dotx + dotRadius, doty);
        ctx.arc(dotx, doty, dotRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = this._active ? "orange" : "white";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 0.5;

        ctx.stroke();
    }

    _processMeasures(parentMeasure, context) {
        super._processMeasures(parentMeasure, context);
        // Qui puoi personalizzare ulteriormente le misure se necessario
    }

    _onPointerEnter() {

    }
    _onPointerOut() {
        this.active = false;
    }

    _onPointerDown(target, coordinates, pointerId, buttonIndex, pi) {
        if (!super._onPointerDown(target, coordinates, pointerId, buttonIndex, pi)) {
            return false;
        }
        
        this._pointerIsDown = true;
        this._host._capturingControl[pointerId] = this;
        this._lastPointerDownId = pointerId;
        let x = coordinates.x - this._currentMeasure.left;
        let y = coordinates.y - this._currentMeasure.top;

        this.offset = {
            x:this.dotPosition.x - x, 
            y:this.dotPosition.y - y
        };
        return true;
    }
    _onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick) {
        this._pointerIsDown = false
        delete this._host._capturingControl[pointerId];
        super._onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick);
    }
    _onPointerMove(target, coordinates, pointerId, pi) {
        // Only listen to pointer move events coming from the last pointer to click on the element (To support dual vr controller interaction)
        let x = coordinates.x - this._currentMeasure.left;
        let y = coordinates.y - this._currentMeasure.top;
        if (pointerId != this._lastPointerDownId || !this._pointerIsDown) {
            let dx = x - this.dotPosition.x;
            let dy = y - this.dotPosition.y;
            this.active = Math.sqrt(dx*dx + dy*dy) < 30.0
            return;
        }
        let posx = x + this.offset.x - this.center.x
        let posy = y + this.offset.y - this.center.y;
        this.angle = Math.atan2(posy,posx);
        this._markAsDirty()
        super._onPointerMove(target, coordinates, pointerId, pi);
        if(this.onChange) {
            let t = this.angle / (2 * Math.PI);
            t = t - Math.floor(t);
            this.onChange(t);
        }
    }
    _onCanvasBlur() {
        this._forcePointerUp();
        super._onCanvasBlur();
    }

}



class RadioButtonsGroup extends BABYLON.GUI.Control {
    constructor(name, options) {
        super(name);
        this.options = options || [];
        this.width = "100px";
        this.height = "400px";
        this.isPointerBlocker = true; // Per intercettare gli eventi del mouse
        this.x = 10;
        this.offset = 0;    
        this._active = false;
        this.angle = 0;
    }

    _draw(ctx) {
        this._applyStates(ctx);
        const {left,top,width,height} = this._currentMeasure;
        for(let i=0; i<this.options.length; i++) {
            let text = this.options[i].label;
            let y = top + i * 40;
            ctx.fillStyle = "gray";
            ctx.fillRect(left, y, width, 30);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(left, y, width, 30);
            
            ctx.fillStyle = "orange"; // option.selected ? "orange" : "white";
            ctx.beginPath();
            let x = left + 10;
            let dotY = y + 15;
            ctx.moveTo(x + 10, dotY);
            ctx.arc(x, dotY, 10, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = "black";
            ctx.font = "14px Arial";
            ctx.fillText(text, left + 30, dotY + 5);
        }
    }

    _processMeasures(parentMeasure, context) {
        super._processMeasures(parentMeasure, context);
        // Qui puoi personalizzare ulteriormente le misure se necessario
    }

    _onPointerEnter() {

    }
    _onPointerOut() {
        this.active = false;
    }

    _onPointerDown(target, coordinates, pointerId, buttonIndex, pi) {
        if (!super._onPointerDown(target, coordinates, pointerId, buttonIndex, pi)) {
            return false;
        }
        
        this._pointerIsDown = true;
        this._host._capturingControl[pointerId] = this;
        this._lastPointerDownId = pointerId;
        let x = coordinates.x - this._currentMeasure.left;
        let y = coordinates.y - this._currentMeasure.top;

        this.offset = {
            x:this.dotPosition.x - x, 
            y:this.dotPosition.y - y
        };
        return true;
    }
    _onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick) {
        this._pointerIsDown = false
        delete this._host._capturingControl[pointerId];
        super._onPointerUp(target, coordinates, pointerId, buttonIndex, notifyClick);
    }
    _onPointerMove(target, coordinates, pointerId, pi) {
        // Only listen to pointer move events coming from the last pointer to click on the element (To support dual vr controller interaction)
        let x = coordinates.x - this._currentMeasure.left;
        let y = coordinates.y - this._currentMeasure.top;
        if (pointerId != this._lastPointerDownId || !this._pointerIsDown) {
            return;
        }
        this._markAsDirty()
        super._onPointerMove(target, coordinates, pointerId, pi);
        if(this.onChange) {
        }
    }
    _onCanvasBlur() {
        this._forcePointerUp();
        super._onCanvasBlur();
    }
}




function createDropdownMenu(options, onSelect) {
    const container = new BABYLON.GUI.Rectangle();
    container.width = "200px";
    container.height = "40px";
    container.cornerRadius = 5;
    container.color = "white";
    container.thickness = 2;
    container.background = "gray";
    container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    container.top = "10px";
    container.left = "10px";
    container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    const stack = new BABYLON.GUI.StackPanel();
    stack.isVertical = true;
    stack.height = "400px"
    container.addControl(stack);

    const titleButton = BABYLON.GUI.Button.CreateSimpleButton("dropdownTitle", "Seleziona...");
    titleButton.height = "40px";
    titleButton.color = "white";
    titleButton.background = "black";
    stack.addControl(titleButton);

    const itemsPanel = new BABYLON.GUI.StackPanel();
    itemsPanel.isVertical = true;
    itemsPanel.isVisible = false;
    stack.addControl(itemsPanel);

    titleButton.onPointerClickObservable.add(() => {
        itemsPanel.isVisible = !itemsPanel.isVisible;
    });

    options.forEach(opt => {
        const item = new BABYLON.GUI.Rectangle();
        item.height = "40px";
        item.width = 1;
        item.color = "white";
        item.thickness = 1;
        item.background = "darkgray";

        const line = new BABYLON.GUI.StackPanel();
        line.isVertical = false;
        line.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

        // Icona
        if (opt.iconUrl) {
            const icon = new BABYLON.GUI.Image("icon", opt.iconUrl);
            icon.width = "30px";
            icon.height = "30px";
            line.addControl(icon);
        }

        // Etichetta
        const label = new BABYLON.GUI.TextBlock();
        label.text = opt.label;
        label.color = "white";
        label.paddingLeft = "10px";
        line.addControl(label);

        item.addControl(line);
        itemsPanel.addControl(item);

        item.onPointerClickObservable.add(() => {
            titleButton.textBlock.text = opt.label;
            itemsPanel.isVisible = false;
            onSelect(opt);
        });
    });

    return container;
}
