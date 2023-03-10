import * as c from './canvas';
import {circle, colors} from "./geo"
import {randInt} from "./util"

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

// varying vec2 v_pos;
uniform vec4 u_color;

void main() {
	// gl_FragColor is a special variable a fragment shader is responsible for setting
	// gl_FragColor = vec4(v_pos, 0.5, 1);
	gl_FragColor = u_color;
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

	const colorUniformLocation = gl.getUniformLocation(program, "u_color")

	console.log(`Resolution (${gl.canvas.width}, ${gl.canvas.height})`)

	let fpsEle = document.createElement("div")
	fpsEle.setAttribute("style", "position: fixed; top: 1rem; right: 1rem; color: white; font-weight: bold; background: black;")
	const body = document.getElementsByTagName("body").item(0)
	if (body) {
		body.appendChild(fpsEle)
		fpsEle.textContent = "00.00 FPS"
	}

	let fpsWalkingSum = 0

	let unknownEle = document.createElement("div")
	unknownEle.setAttribute("style", "position: fixed; top: 2rem; right: 1rem; color: white; font-weight: bold; background: black;")
	if (body) {
		body.appendChild(unknownEle)
		unknownEle.textContent = "unknown time: 00.00"
	}

	let collisionEle = document.createElement("div")
	collisionEle.setAttribute("style", "position: fixed; top: 3rem; right: 1rem; color: white; font-weight: bold; background: black;")
	if (body) {
		body.appendChild(collisionEle)
		collisionEle.textContent = "collision time: 00.00"
	}

	let collisionTimeWalkingSum = 0

	let drawEle = document.createElement("div")
	drawEle.setAttribute("style", "position: fixed; top: 4rem; right: 1rem; color: white; font-weight: bold; background: black;")
	if (body) {
		body.appendChild(drawEle)
		drawEle.textContent = "draw time: 00.00"
	}

	let drawTimeWalkingSum = 0

	const nCircles = 1000
	console.log("Num Circles:", nCircles)
	const circles = [...Array(nCircles)].map((_, i) => {
		const r = randInt(3, 3)
		return new circle(
			{x: randInt(r, gl.canvas.width - r), y: randInt(r, gl.canvas.height - r)},
			r,
			Math.floor(r * 0.8) <= 10 ? 10 : Math.floor(r * 0.8),
			i % 3 === 0 ? colors.green : i % 4 === 0 ? colors.red : colors.blue,
			{x: 0, y: 0},
			50,
		)
	})


	/* const circles = [ */
	/* 	new circle( */
	/* 		{x: 700, y: gl.canvas.height/2}, */
	/* 		50, */
	/* 		30*.8, */
	/* 		colors.green, */
	/* 		{x: 0, y: 0}, */
	/* 		250 */
	/* 	), */
	/* 	new circle( */
	/* 		{x: 900, y: gl.canvas.height/2}, */
	/* 		50, */
	/* 		30*.9, */
	/* 		colors.blue, */
	/* 		{x: 0, y: 0}, */
	/* 		250 */
	/* 	) */
	/* ] */

	const colorIndices: Record<string, number> = circles.reduce((acc, curr) => {
		if (acc[curr.color.string] !== undefined) {
			return acc
		}
		acc[curr.color.string] = Object.keys(acc).length
		return acc
	}, {} as Record<string, number>)

	const behaviourMatrix: Array<Array<number>> = [...Array(Object.keys(colorIndices).length)].map(() => [0])
	// row -> col == row to col
	behaviourMatrix[colorIndices[colors.blue.string]][colorIndices[colors.green.string]] = +100
	behaviourMatrix[colorIndices[colors.green.string]][colorIndices[colors.blue.string]] = -100
	behaviourMatrix[colorIndices[colors.green.string]][colorIndices[colors.red.string]] = +100
	behaviourMatrix[colorIndices[colors.red.string]][colorIndices[colors.green.string]] = -100

	gl.useProgram(program)

	// Set the resolution uniform
	const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")
	gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height)

	const maxDiam = circles.reduce((acc, curr) => curr.r > acc ? curr.r : acc, 0) * 2
	const cellWidth = Math.max(maxDiam, gl.canvas.width/100) // 100, arbitrary ceiling for performance reasons
	const cellHeight = Math.max(maxDiam, gl.canvas.height/50) // 50, arbitrary ceiling for performance reasons
	const nHorizontalParitions = Math.floor(gl.canvas.width/cellWidth)
	const nVerticalPartitions = Math.floor(gl.canvas.height/cellHeight)
	console.log(`Cells: num: (${nHorizontalParitions}, ${nVerticalPartitions}), size: (${cellWidth}, ${cellHeight})`)

	let sampleCount = 0
	let then = 0
	const drawScene = (time: number) => {
		time *= 0.001
		const deltaTime = time - then
		then = time

		sampleCount++

		const fps = 1 / (deltaTime)
		fpsWalkingSum += fps

		c.resizeCanvasToDisplaySize(canvas)
		// Tell WebGL how to convert from the clip space values we'll be setting
		// gl_Position to, back to pixels (often called screen space)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Clear the canvas
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		let start = performance.now()
		const cells: Array<Array<number>> = [...Array(nHorizontalParitions * nVerticalPartitions)].map(_ => [])
		for (let i = 0; i < circles.length; i++) {
			const c = circles[i]

			let col = Math.floor(c.x / cellWidth)
			let row = Math.floor(c.y / cellHeight)
			if (row * nHorizontalParitions + col < 0)
				cells[0].push(i)
			else if (row * nHorizontalParitions + col >= cells.length)
				cells[cells.length - 1].push(i)
			else
				cells[row * nHorizontalParitions + col].push(i)
		}

		let hasCollided = Array(circles.length).fill(0)
		for (let i = 1; i < nHorizontalParitions - 1; i++) {
			for (let j = 1; j < nVerticalPartitions - 1; j++) {
				// check every cell's neighbours, get all circle idx's and check collision
				const cellIdx = j * nHorizontalParitions + i
				const circleIndices = [
					...cells[cellIdx-1 - nHorizontalParitions], ...cells[cellIdx - nHorizontalParitions], ...cells[cellIdx+1 - nHorizontalParitions],
					...cells[cellIdx-1], ...cells[cellIdx], ...cells[cellIdx+1],
					...cells[cellIdx-1 + nHorizontalParitions], ...cells[cellIdx + nHorizontalParitions], ...cells[cellIdx+1 + nHorizontalParitions],
				]

				if (circleIndices.length <= 1) { continue }

				for (let a = 0; a < circleIndices.length; a++) {
					if (hasCollided[circleIndices[a]]) continue

					const c = circles[circleIndices[a]]

					for (let b = 0; b < circleIndices.length; b++) {
						if (circleIndices[a] === circleIndices[b] || hasCollided[circleIndices[b]]) continue
						const _c = circles[circleIndices[b]]

						if (c.isColliding(_c)) {
						/* if (c.doesCollide(Math.abs(deltaTime), _c)) { */
							hasCollided[circleIndices[a]] = 1
							hasCollided[circleIndices[b]] = 1
							c.collide(_c)
						}

						const behaviourFactor = behaviourMatrix[colorIndices[c.color.string]][colorIndices[_c.color.string]]
						if (c.isAffectedBy(_c) && !isNaN(behaviourFactor) && behaviourFactor !== 0) {
						/* if (c.doesAffect(deltaTime, _c) && behaviourFactor !== 0) { */
							c.reactTo(_c, behaviourFactor)
						}
					}
				}
			}
		}
		collisionTimeWalkingSum += performance.now() - start

		start = performance.now()
		for (let i = 0; i < circles.length; i ++) {
			const c = circles[i]

			c.update(Math.abs(deltaTime), gl.canvas.width, gl.canvas.height)

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(c.indices), gl.STATIC_DRAW)

			const size = 2
			const type = gl.FLOAT
			const normalize = false
			const stride = 0
			const offset = 0
			gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset)
			gl.enableVertexAttribArray(positionAttributeLocation)

			gl.uniform4f(colorUniformLocation, c.color.x, c.color.y, c.color.z, c.color.w)

			gl.drawArrays(gl.TRIANGLES, offset, c.indices.length)
		}
		drawTimeWalkingSum += performance.now() - start

		if(sampleCount >= 50) {
			fpsEle.textContent = (fpsWalkingSum / sampleCount).toFixed(2) + " FPS"
			fpsWalkingSum = 0

			unknownEle.textContent = `unknown time: ${(deltaTime*1000 - (collisionTimeWalkingSum/sampleCount + drawTimeWalkingSum/sampleCount)).toFixed(2)}ms`

			collisionEle.textContent = `collision time: ${(collisionTimeWalkingSum/sampleCount).toFixed(2)}ms (${((collisionTimeWalkingSum/sampleCount)/ (deltaTime*1000) * 100).toFixed(2)}%)`
			collisionTimeWalkingSum = 0

			drawEle.textContent = `draw time: ${(drawTimeWalkingSum/sampleCount).toFixed(2)}ms (${((drawTimeWalkingSum/sampleCount)/ (deltaTime*1000) * 100).toFixed(2)}%)`
			drawTimeWalkingSum = 0

			sampleCount = 0
		}

		requestAnimationFrame(drawScene)
	}

	drawScene(1)
}

main()
