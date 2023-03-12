import * as c from './canvas';
import {Renderer, Solver} from './engine';
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

	const renderer = new Renderer(gl)
	const solver = new Solver(renderer.w, renderer.h, 100)

	let sampleCount = 0
	let then = 0
	const drawScene = (time: number) => {
		time *= 0.001
		const dt = time - then
		then = time

		sampleCount++

		const fps = 1 / (dt)
		fpsWalkingSum += fps

		c.resizeCanvasToDisplaySize(canvas)
		// Tell WebGL how to convert from the clip space values we'll be setting
		// gl_Position to, back to pixels (often called screen space)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Clear the canvas
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		let start = performance.now()
		solver.update(dt)
		collisionTimeWalkingSum += performance.now() - start

		start = performance.now()
		for (let i = 0; i < solver.verlets.length; i++) {
			renderer.drawVerlet(solver.verlets[i])
		}
		drawTimeWalkingSum += performance.now() - start

		if(sampleCount >= 50) {
			fpsEle.textContent = (fpsWalkingSum / sampleCount).toFixed(2) + " FPS"
			fpsWalkingSum = 0

			unknownEle.textContent = `unknown time: ${(dt*1000 - (collisionTimeWalkingSum/sampleCount + drawTimeWalkingSum/sampleCount)).toFixed(2)}ms`

			collisionEle.textContent = `collision time: ${(collisionTimeWalkingSum/sampleCount).toFixed(2)}ms (${((collisionTimeWalkingSum/sampleCount)/ (dt*1000) * 100).toFixed(2)}%)`
			collisionTimeWalkingSum = 0

			drawEle.textContent = `draw time: ${(drawTimeWalkingSum/sampleCount).toFixed(2)}ms (${((drawTimeWalkingSum/sampleCount)/ (dt*1000) * 100).toFixed(2)}%)`
			drawTimeWalkingSum = 0

			sampleCount = 0
		}

		requestAnimationFrame(drawScene)
	}

	drawScene(1)
}

main()
