import * as c from './canvas';

const main = () => {
	let gl = c.loadCanvasContext()

	if (!gl) {
		console.error("Failed to load WebGL context.")
		return;
	}
}

main()
