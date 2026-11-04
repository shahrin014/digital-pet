declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    numberofcolors?: number;
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    colorsampling?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    layering?: number;
    strokewidth?: number;
    linefilter?: boolean;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    blurradius?: number;
    blurdelta?: number;
  }

  interface ImageTracer {
    imagedataToSVG(
      imgd: ImageData,
      options?: ImageTracerOptions | string,
    ): string;
  }

  const ImageTracer: ImageTracer;
  export default ImageTracer;
}
