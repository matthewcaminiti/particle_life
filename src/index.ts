import * as c from './canvas';
import {Renderer, Solver} from './engine';
import {initStatWindow, initControlPanel} from './ui'
import {colors} from "./geo"

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

	let numVerlets = 750
	const stats = initStatWindow()
	const controlPanel = initControlPanel(numVerlets)

	const renderer = new Renderer(gl)
	let solver = new Solver(
		renderer.w,
		renderer.h,
		numVerlets,
		controlPanel.behaviourMatrix,
		controlPanel.colorIndices)

	document.getElementById("restart-btn")?.addEventListener("click", () => {
		solver = new Solver(
			renderer.w,
			renderer.h,
			numVerlets,
			controlPanel.behaviourMatrix,
			controlPanel.colorIndices)
	})

	controlPanel.incrButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			numVerlets += btn.textContent ? Number(btn.textContent) : 0
			controlPanel.nVerletEle.textContent = numVerlets.toString()
		})
	})

	controlPanel.colorCheckboxes.forEach((checkbox) => {
		checkbox.addEventListener("click", () => {
			const color = checkbox.getAttribute("id")?.split("-")[1] ?? ''

			if (!isNaN(controlPanel.colorIndices[colors[color].string])) {
				const idx = controlPanel.colorIndices[colors[color].string]
				controlPanel.behaviourMatrix = controlPanel.behaviourMatrix.map((arr, i) => {
					if (i === idx) return arr.map(() => 0)
					return arr.map((val, j) => j === idx ? 0 : val)
				})

				document.querySelectorAll("td[id^='behaviour-']")?.forEach((cell) => {
					const id = cell.getAttribute("id")
					const c1 = id?.split("-")[1] ?? ''
					const c2 = id?.split("-")[2] ?? ''
					if (c1 === color || c2 === color) cell.textContent = ""
				})

				delete controlPanel.colorIndices[colors[color].string]
			} else {
				const nColors = Object.keys(controlPanel.colorIndices).length
				controlPanel.behaviourMatrix.push(Array(nColors + 1).map(() => 0))
				controlPanel.colorIndices[colors[color].string] = nColors
			}
		})
	})

	document.querySelectorAll("td[id^='behaviour-']")?.forEach((cell) => {
		const id = cell.getAttribute("id")
		const c1 = id?.split("-")[1] ?? ''
		const c2 = id?.split("-")[2] ?? ''

		let c1Idx = controlPanel.colorIndices[colors[c1].string]
		let c2Idx = controlPanel.colorIndices[colors[c2].string]

		cell.addEventListener("click", () => {
			if (isNaN(c1Idx)) {
				const nColors = Object.keys(controlPanel.colorIndices).length
				controlPanel.behaviourMatrix.map((arr) => arr.push(0))
				controlPanel.behaviourMatrix.push([...Array(nColors + 1)].map(() => 0))
				controlPanel.colorIndices[colors[c1].string] = nColors
				c1Idx = nColors

				const checkbox = document.getElementById(`checkbox-${c1}`) as HTMLInputElement
				if (checkbox) checkbox.checked = true
			}

			if (isNaN(c2Idx)) {
				const nColors = Object.keys(controlPanel.colorIndices).length
				controlPanel.behaviourMatrix.map((arr) => arr.push(0))
				controlPanel.behaviourMatrix.push([...Array(nColors + 1)].map(() => 0))
				controlPanel.colorIndices[colors[c2].string] = nColors
				c2Idx = nColors

				const checkbox = document.getElementById(`checkbox-${c1}`) as HTMLInputElement
				if (checkbox) checkbox.checked = true
			}

			const val = controlPanel.behaviourMatrix[c1Idx][c2Idx]
			controlPanel.behaviourMatrix[c1Idx][c2Idx] = val === 5 ? -5 : val+1
			cell.textContent = controlPanel.behaviourMatrix[c1Idx][c2Idx].toString()
		})
	})


	let sampleCount = 0
	let then = 0
	const drawScene = (time: number) => {
		time *= 0.001
		const dt = time - then
		then = time

		sampleCount++

		const fps = 1 / (dt)
		stats.fpsWalkingSum += fps

		c.resizeCanvasToDisplaySize(canvas)
		// Tell WebGL how to convert from the clip space values we'll be setting
		// gl_Position to, back to pixels (often called screen space)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Clear the canvas
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		let start = performance.now()
		solver.update(dt)
		stats.collisionTimeWalkingSum += performance.now() - start

		start = performance.now()
		for (let i = 0; i < solver.verlets.length; i++) {
			renderer.drawVerlet(solver.verlets[i])
		}
		stats.drawTimeWalkingSum += performance.now() - start

		if(sampleCount >= 50) {
			stats.fpsEle.textContent = (stats.fpsWalkingSum / sampleCount).toFixed(2)
			stats.fpsWalkingSum = 0

			stats.unknownEle.textContent = `${(dt*1000 - (stats.collisionTimeWalkingSum/sampleCount + stats.drawTimeWalkingSum/sampleCount)).toFixed(2)}ms`

			stats.collisionEle.textContent = `${(stats.collisionTimeWalkingSum/sampleCount).toFixed(2)}ms (${((stats.collisionTimeWalkingSum/sampleCount)/ (dt*1000) * 100).toFixed(2)}%)`
			stats.collisionTimeWalkingSum = 0

			stats.drawEle.textContent = `${(stats.drawTimeWalkingSum/sampleCount).toFixed(2)}ms (${((stats.drawTimeWalkingSum/sampleCount)/ (dt*1000) * 100).toFixed(2)}%)`
			stats.drawTimeWalkingSum = 0

			sampleCount = 0
		}

		requestAnimationFrame(drawScene)
	}

	drawScene(1)
}

main()
