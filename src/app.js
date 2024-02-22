async function imageMerge(operation){
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext("2d");
    
    let widgets = await miro.board.getSelection({type: 'image'})
  
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
  
    widgets.forEach(widget => {
      let left = widget.x - widget.width / 2;
      let right = widget.x + widget.width / 2;
      let top = widget.y - widget.height / 2;
      let bottom = widget.y + widget.height / 2;
    
      if (left < minX) {
        minX = left;
      }
      if (top < minY) {
        minY = top;
      }
      if (right > maxX) {
        maxX = right;
      }
      if (bottom > maxY) {
        maxY = bottom;
      }
    });
  
    // Now minX, minY, maxX, maxY represent the bounding box
    let boundingBox = {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  
    console.log(boundingBox);
  
    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
  
    console.log('before', widgets);
  
    widgets = widgets.sort(async(a, b) => {
      const prev = await a.getLayerIndex()
      const current = await b.getLayerIndex()
      console.log(prev, current)
      return prev - current;
    });
  
    console.log('after', widgets);
  
    for (const widget of widgets) {
        const base64Image = await widget.getDataUrl();
      await new Promise(async(resolve, reject) => {
        let image = new Image();
        image.onload = function() {
          console.log(widget.x - boundingBox.left, widget.y - boundingBox.top, widget.width, widget.height)
          ctx.drawImage(image, (widget.x - widget.width / 2) - boundingBox.left, (widget.y - widget.height / 2) - boundingBox.top, widget.width, widget.height );
          ctx.globalCompositeOperation = operation;
          resolve();
        };
        image.onerror = reject;
        image.src = base64Image;
      });
    }
  
    var sData = canvas.toDataURL('image/png', 1);

    return sData;
    
  
}

// Sender
function sendInChunks(data, targetWindow, origin) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    for (let start = 0; start < data.length; start += CHUNK_SIZE) {
      const chunk = data.slice(start, start + CHUNK_SIZE);
      targetWindow.postMessage(chunk, origin);
      console.log('sent', start, start + CHUNK_SIZE);
    }
    targetWindow.postMessage("EOF", origin);
  }

  var targetWindow;

document.getElementById("editDesign").addEventListener("click", async function() {
    const imageData = await imageMerge('source-over');
    //console.log(imageData);

    targetWindow = window.open("editor.html?mode=edit", "_blank");
    targetWindow.onload = function() {
        sendInChunks(imageData, targetWindow, window.location.origin);
    };

});

document.getElementById("createDesign").addEventListener("click", async function() {
    targetWindow = window.open("editor.html?mode=new", "_blank");
    targetWindow.onload = function() {
        targetWindow.postMessage("EOF", origin);
    };
    

});

document.getElementById("demoIframeIssue").addEventListener("click", async function() {
  miro.board.ui.openModal({url: "editor.html?mode=new"})
});

window.addEventListener('message', async (event) => {
    //console.log('Received data:', event.data);
    // Always validate the origin
    if (event.origin === window.location.origin) {
        const viewport = await miro.board.viewport.get();
        const image = miro.board.createImage({url: event.data, x: viewport.x + viewport.width/2, y: viewport.y + viewport.height/2});
        await miro.board.viewport.zoomTo(image)
        targetWindow.close();
    }
});
