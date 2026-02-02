import * as THREE from "three";
import * as xb from "xrblocks";

// We keep these for the Splat data and the custom shadow catcher
import { SPLAT_DATA } from "./splat_data.js";
import { DepthMeshClone } from "./DepthMeshClone.js";

const kLightX = xb.getUrlParamFloat("lightX", 0);
const kLightY = xb.getUrlParamFloat("lightY", 500);
const kLightZ = xb.getUrlParamFloat("lightZ", -10);

export class OcclusionScene extends xb.Script {
  constructor() {
    super();
    this.pointer = new THREE.Vector3();
    this.depthMeshClone = new DepthMeshClone();
    this.raycaster = new THREE.Raycaster();

    // Create a single ModelViewer instance specifically for our Splat
    // Splats don't need to cast/receive standard Three.js shadows
    this.splatModel = new xb.ModelViewer({
      castShadow: false,
      receiveShadow: false,
    });

    // Crucial for occlusion: Put the splat on the specific layer
    // that allows it to be hidden by real-world walls.
    this.splatModel.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);

    // Hide it initially until the user clicks to place it
    this.splatModel.visible = false;
    this.add(this.splatModel);

    this.instructionText = "Pinch to place building";
    this.instructionCol = null;
  }

  async init() {
    this.addLights();
    xb.showReticleOnDepthMesh(true);
    this.addPanel();

    // Start loading the splat immediately in the background
    await this.loadSplatAsset();
  }

  async loadSplatAsset() {
    try {
      // We pull the URL from the first item in your SPLAT_DATA
      const asset = SPLAT_DATA[0];

      console.log("Loading Splat:", asset.model);

      await this.splatModel.loadSplatModel({
        data: {
          model: asset.model,
          scale: asset.scale || { x: 1, y: 1, z: 1 },
          rotation: asset.rotation || { x: 0, y: 180, z: 0 },
        },
      });

      console.log("Splat loaded successfully!");
    } catch (error) {
      console.error("Failed to load splat using loadSplatModel:", error);
    }
  }

  /**
   * Logic to move the splat to the hit location
   */
  placeSplat(intersection) {
    if (!this.splatModel) return;

    // Move the splat to the point where the user clicked on the real world
    this.splatModel.position.copy(intersection.point);
    this.splatModel.visible = true;

    // Optional: Make it face the camera
    this.splatModel.lookAt(
      xb.core.camera.position.x,
      this.splatModel.position.y,
      xb.core.camera.position.z
    );
  }

  onDepthMeshSelectStart(intersection) {
    this.placeSplat(intersection);
  }

  // --- Interaction & UI Logic (Same as before but targeting this.placeSplat) ---

  addPanel() {
    const panel = new xb.SpatialPanel({
      backgroundColor: "#00000000",
      useDefaultPosition: false,
      showEdge: false,
    });
    panel.position.set(0, 1.6, -1.0);
    panel.isRoot = true;
    this.add(panel);

    const grid = panel.addGrid();
    grid.addRow({ weight: 0.05 });
    grid.addRow({ weight: 0.1 });

    const controlRow = grid.addRow({ weight: 0.3 });
    const ctrlPanel = controlRow.addPanel({ backgroundColor: "#000000bb" });
    const ctrlGrid = ctrlPanel.addGrid();

    const midColumn = ctrlGrid.addCol({ weight: 0.9 });
    midColumn.addRow({ weight: 0.3 });
    const gesturesRow = midColumn.addRow({ weight: 0.4 });
    gesturesRow.addCol({ weight: 0.05 });

    const textCol = gesturesRow.addCol({ weight: 1.0 });
    this.instructionCol = textCol.addRow({ weight: 1.0 }).addText({
      text: `${this.instructionText}`,
      fontColor: "#ffffff",
      fontSize: 0.05,
    });

    gesturesRow.addCol({ weight: 0.01 });
    midColumn.addRow({ weight: 0.1 });

    const orbiter = ctrlGrid.addOrbiter();
    orbiter.addExitButton();

    panel.updateLayouts();
    this.panel = panel;
  }

  onSimulatorStarted() {
    this.instructionText = "Pinch to place building";
    if (this.instructionCol) this.instructionCol.setText(this.instructionText);
  }

  addLights() {
    this.add(new THREE.HemisphereLight(0xbbbbbb, 0x888888, 3));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(kLightX, kLightY, kLightZ);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.add(light);
  }

  updatePointerPosition(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onSelectStart(event) {
    const controller = event.target;
    const intersections =
      xb.core.input.intersectionsForController.get(controller);
    if (intersections && intersections.length > 0) {
      const intersection = intersections[0];
      if (intersection.object == xb.core.depth.depthMesh) {
        this.onDepthMeshSelectStart(intersection);
      }
    }
  }

  onPointerDown(event) {
    this.updatePointerPosition(event);
    const cameras = xb.core.renderer.xr.getCamera().cameras;
    if (cameras.length == 0) return;
    const camera = cameras[0];
    this.raycaster.setFromCamera(this.pointer, camera);

    // Intersect the real world (depthMesh)
    const intersections = this.raycaster.intersectObjects([
      xb.core.depth.depthMesh,
    ]);
    if (intersections.length > 0) {
      this.placeSplat(intersections[0]);
    }
  }
}
