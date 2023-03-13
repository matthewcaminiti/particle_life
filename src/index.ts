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
	const control = initControlPanel(numVerlets)

	const renderer = new Renderer(gl)
	let solver = new Solver(
		renderer.w,
		renderer.h,
		numVerlets,
		control.chosenColors,
		control.behaviourMatrix,
		control.colorIndices)

	document.getElementById("restart-btn")?.addEventListener("click", () => {
		solver = new Solver(
			renderer.w,
			renderer.h,
			numVerlets,
			control.chosenColors,
			control.behaviourMatrix,
			control.colorIndices)
	})

	control.incrButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			numVerlets += btn.textContent ? Number(btn.textContent) : 0
			control.nVerletEle.textContent = numVerlets.toString()
		})
	})

	control.colorCheckboxes.forEach((checkbox) => {
		checkbox.addEventListener("click", () => {
			const color = checkbox.getAttribute("id")?.split("-")[1] ?? ''

			document.querySelectorAll("td[id^='behaviour-']")?.forEach((cell) => {
				const id = cell.getAttribute("id")
				const c1 = id?.split("-")[1] ?? ''
				const c2 = id?.split("-")[2] ?? ''
				if (c1 === color || c2 === color) {
					cell.textContent = ""
					if (c1 === color)
						control.behaviourMatrix[control.colorIndices[colors[c1].string]][control.colorIndices[colors[c2].string]] = 0
					if (c2 === color)
						control.behaviourMatrix[control.colorIndices[colors[c2].string]][control.colorIndices[colors[c1].string]] = 0
				}
			})

			const filtered = control.chosenColors.filter((c) => c !== colors[color].string)
			if (filtered.length !== control.chosenColors.length)
				control.chosenColors = filtered
			else
				control.chosenColors.push(colors[color].string)
		})
	})

	document.querySelectorAll("td[id^='behaviour-']")?.forEach((cell) => {
		const id = cell.getAttribute("id")
		const c1 = id?.split("-")[1] ?? ''
		const c2 = id?.split("-")[2] ?? ''

		cell.addEventListener("click", () => {
			let c1Idx = control.colorIndices[colors[c1].string]
			let c2Idx = control.colorIndices[colors[c2].string]

			const c1Checkbox = document.getElementById(`checkbox-${c1}`) as HTMLInputElement
			if (!c1Checkbox.checked) {
				c1Checkbox.checked = true
				control.chosenColors.push(colors[c1].string)
			}

			const c2Checkbox = document.getElementById(`checkbox-${c2}`) as HTMLInputElement
			if (!c2Checkbox.checked) {
				c2Checkbox.checked = true
				control.chosenColors.push(colors[c2].string)
			}

			const val = control.behaviourMatrix[c1Idx][c2Idx]
			control.behaviourMatrix[c1Idx][c2Idx] = val === 5 ? -5 : val+1
			cell.textContent = control.behaviourMatrix[c1Idx][c2Idx] !== 0 ? control.behaviourMatrix[c1Idx][c2Idx].toString() : ''
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
