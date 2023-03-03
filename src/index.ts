import * as c from './canvas';
import {rect} from "./geo"

const main = () => {
	const canvas = document.querySelector("#canvas") as HTMLCanvasElement | null;

	if (!canvas) {
		throw new Error("Failed to select canvas DOM element!");
	}

	const gl = canvas.getContext("webgl")

	if (!gl) {
		throw new Error("Failed to load WebGL context.")
	}

	c.resizeCanvasToDisplaySize(canvas)

	const vertexShaderSrc = `
// an attribute will receive data from a buffer
attribute vec2 a_position;

uniform vec2 u_resolution;

varying vec2 v_pos;

// all shaders have a main function
void main() {
	// convert the position from pixels to 0.0 to 1.0
	vec2 zeroToOne = a_position / u_resolution;

	// convert from 0->1 to 0->2
	vec2 zeroToTwo = zeroToOne * 2.0;

	// convert from 0->2 to -1->+1 (clip space)
	vec2 clipSpace = zeroToTwo - 1.0;

	vec2 yFlipped = vec2(clipSpace.x, clipSpace.y * -1.0);
	
	// gl_Position is a special variable a vertex shader
	// is responsible for setting
	gl_Position = vec4(yFlipped, 0, 1);

	v_pos = gl_Position.xy;
}
	`

	const fragmentShaderSrc = `
// fragment shaders don't have a default precision so we need to pick one.
// mediump is a good default. it means "medium precision"
precision mediump float;

varying vec2 v_pos;

void main() {
	// gl_FragColor is a special variable a fragment shader is responsible for setting
	gl_FragColor = vec4(v_pos, 0.5, 1);
}
	`
	
	const vertexShader = c.createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc)
	const fragmentShader = c.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc)

	const program = c.createProgram(gl, vertexShader, fragmentShader)

	const positionAttributeLocation = gl.getAttribLocation(program, "a_position")
	const positionBuffer = gl.createBuffer()
	if (!positionBuffer) {
		throw new Error("Failed to create position buffer")
	}

	console.log(`Resolution (${gl.canvas.width}, ${gl.canvas.height})`)

	let fpsEle = document.createElement("div")
	fpsEle.setAttribute("style", "position: fixed; top: 1rem; right: 1rem; color: white; font-weight: bold; background: black;")
	const body = document.getElementsByTagName("body").item(0)
	if (body) {
		body.appendChild(fpsEle)
		fpsEle.textContent = "00.00"
	}

	let fpsWalkingSum = 0
	let fpsSampleCount = 0

	/* let speed = 100; */
	/**/
	/* let positions = [ */
	/* 	0, 0, */
	/* 	100, 0, */
	/* 	100, 100, */
	/**/
	/* 	0, 0, */
	/* 	0, 100, */
	/* 	100, 100, */
	/* ] */

	const squares = Array(5).fill(0).map(() => new rect(
		Math.random() * (gl.canvas.width - 10) + 10,
		Math.random() * (gl.canvas.height - 10) + 10,
		Math.floor(Math.random() * 100 + 10),
		Math.floor(Math.random() * 100 + 10),
		Math.floor(Math.random() * 500 + 100)
	))

	/* let jah = new rect(gl.canvas.width / 2, gl.canvas.height / 2, 100, 100, 300) */
	gl.useProgram(program)

	// Set the resolution uniform
	const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")
	gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height)

	let then = 0
	const drawScene = (time: number) => {
		time /= 1000
		const deltaTime = time - then
		then = time

		const fps = 1 / (deltaTime)
		fpsWalkingSum += fps
		fpsSampleCount++
		if (fpsSampleCount >= 10) {
			fpsEle.textContent = (fpsWalkingSum / fpsSampleCount).toFixed(2)
			fpsWalkingSum = 0
			fpsSampleCount = 0
		}

		c.resizeCanvasToDisplaySize(canvas)
		// Tell WebGL how to convert from the clip space values we'll be setting
		// gl_Position to, back to pixels (often called screen space)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Clear the canvas
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		squares.forEach((s) => {
			s.update(Math.abs(deltaTime), gl.canvas.width, gl.canvas.height)

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.positions), gl.STATIC_DRAW)

			const size = 2
			const type = gl.FLOAT
			const normalize = false
			const stride = 0
			const offset = 0
			gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset)
			gl.enableVertexAttribArray(positionAttributeLocation)

			const primitiveType = gl.TRIANGLES
			const nIndices = 6
			gl.drawArrays(primitiveType, offset, nIndices)
		})

		requestAnimationFrame(drawScene)
	}

	drawScene(1)
}

main()
