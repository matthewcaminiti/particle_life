const loadCanvasContext = (): WebGLRenderingContext | null => {
	var canvas = document.querySelector("#canvas") as HTMLCanvasElement | null;

	if (!canvas) {
		console.error("Failed to select canvas DOM element!");
		return null;
	}

	return canvas.getContext("webgl");
}

export {
	loadCanvasContext
}
