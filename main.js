// Import the core XR Blocks library
import * as xb from "xrblocks";

// Import your custom scene logic where the 3D objects and behaviors are defined
import { OcclusionScene } from "./OcclusionScene.js";

/**
 * 1. CONFIGURING XR OPTIONS
 * This section sets up how the XR session will behave, specifically enabling
 * world-sensing features like Depth and Occlusion.
 */
const options = new xb.Options();

// Enables the "reticle" (the targeting circle that follows your gaze or hand)
options.reticles.enabled = true;

// Configure Advanced Depth Sensing
// 'xrDepthMeshOptions' tells the engine to use the device's depth sensors to create a 3D mesh of your room.
options.depth = new xb.DepthOptions(xb.xrDepthMeshOptions);

// Force the depth mesh to update at the highest possible detail
options.depth.depthMesh.updateFullResolutionGeometry = true;

// Allows virtual objects to cast shadows onto real-world surfaces (like the floor)
options.depth.depthMesh.renderShadow = false;

// Enables the depth texture, which is used for advanced visual effects
options.depth.depthTexture.enabled = true;

// THE "MAGIC" LINE: Enables Occlusion.
// This allows physical objects in your room to "block" your view of virtual ones.
options.depth.occlusion.enabled = true;

/**
 * 2. CUSTOMIZING THE UI
 * Changes the text on the "Enter AR" button.
 * It uses HTML <i> tags to likely inject a custom CSS icon.
 */
options.xrButton.startText = '<i id="xrlogo"></i> BRING IT TO LIFE';
options.xrButton.endText = '<i id="xrlogo"></i> MISSION COMPLETE';

/**
 * 3. INITIALIZING THE ENGINE
 */
async function start() {
  // Create an instance of your specific 3D scene
  const occlusion = new OcclusionScene();

  // Start the XR Blocks engine with the depth/occlusion options defined above
  await xb.init(options);

  // Add your scene logic to the engine's lifecycle
  xb.add(occlusion);

  /**
   * 4. INTERACTION HANDLING
   * Listens for a screen tap (pointerdown).
   * .bind(occlusion) ensures that inside the onPointerDown function,
   * the keyword 'this' still refers to your OcclusionScene class.
   */
  window.addEventListener(
    "pointerdown",
    occlusion.onPointerDown.bind(occlusion)
  );
}

// Kick off the start function once the web page is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  start();
});
