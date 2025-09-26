import { DynamicTexture, Scene, StandardMaterial } from "@babylonjs/core";

export async function initGifAnimation(scene: Scene, material: StandardMaterial, gifUrl: string): Promise<()=>void> {
  // Check if ImageDecoder is supported
  if (typeof (window as any).ImageDecoder === 'undefined') {
    alert('ImageDecoder not supported, GIF will be static');
    throw new Error('ImageDecoder not supported');
  }

  const response = await fetch(gifUrl);
  const imageDecoder = new (window as any).ImageDecoder({ data: response.body, type: 'image/gif' });

  await imageDecoder.tracks.ready;
  await imageDecoder.completed;

  console.log(imageDecoder, `GIF has ${imageDecoder.tracks[0].frameCount} frames`);

  const maxFrame = imageDecoder.tracks[0].frameCount;

  if (maxFrame <= 1) {
    console.log('GIF has only one frame, will be static');
    throw new Error('GIF has only one frame');
  }

  // Create a single dynamic texture that we'll reuse
  const firstResult = await imageDecoder.decode({ frameIndex: 0 });
  const canvas = document.createElement('canvas');
  canvas.width = firstResult.image.displayWidth;
  canvas.height = firstResult.image.displayHeight;
  const ctx = canvas.getContext('2d');
  let timeout: NodeJS.Timeout;

  if (!ctx) {
    console.error('Could not get canvas context');
    throw new Error('Could not get canvas context');
  }

  // Create the dynamic texture once
  const dynamicTexture = new DynamicTexture(`lavaAnimated`, { width: canvas.width, height: canvas.height }, scene, false);
  const dynamicCtx = dynamicTexture.getContext();

  // Set up the material with the dynamic texture
  material.diffuseTexture = dynamicTexture;
  material.emissiveTexture = dynamicTexture;

  let imageIndex = 0;
  const render = async () => {
    try {
      const result = await imageDecoder.decode({ frameIndex: imageIndex });

      // Draw frame to our canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(result.image, 0, 0);

      // Copy canvas to dynamic texture
      dynamicCtx.clearRect(0, 0, canvas.width, canvas.height);
      dynamicCtx.drawImage(canvas, 0, 0);
      dynamicTexture.update();

      imageIndex++;
      if (imageIndex >= maxFrame) {
        imageIndex = 0;
      }

      // Use the frame duration from the GIF, with a minimum of 100ms
      const duration = Math.max(result.image.duration / 1000.0, 100);
      timeout = setTimeout(render, duration / 5);
    } catch (error) {
      console.error('Error decoding GIF frame:', error);
    }
  };

  await render();
  return ()=>{
    clearTimeout(timeout);
  }
}