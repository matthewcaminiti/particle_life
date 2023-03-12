import {colors, COLOR_NAMES} from "./geo"
import {randInt} from "./util"

interface statWindow {
	fpsEle: HTMLDivElement
	fpsWalkingSum: number
	unknownEle: HTMLDivElement
	collisionEle: HTMLDivElement
	collisionTimeWalkingSum: number
	drawEle: HTMLDivElement
	drawTimeWalkingSum: number
}

export const initStatWindow = (): statWindow => {
	const fpsEle = document.getElementById("fps-ele") as HTMLDivElement
	const fpsWalkingSum = 0

	const unknownEle = document.getElementById("unknown-ele") as HTMLDivElement

	const collisionEle = document.getElementById("collision-ele") as HTMLDivElement
	const collisionTimeWalkingSum = 0

	const drawEle = document.getElementById("draw-ele") as HTMLDivElement
	const drawTimeWalkingSum = 0

	return{
		fpsEle,
		fpsWalkingSum,
		unknownEle,
		collisionEle,
		collisionTimeWalkingSum,
		drawEle,
		drawTimeWalkingSum,
	}
}

interface controlPanel {
	nVerletEle: HTMLDivElement
	incrButtons: NodeListOf<Element>
	colorCheckboxes: Array<HTMLInputElement>
	behaviourMatrix: Array<Array<number>>
	colorIndices: Record<string, number>
}

export const initControlPanel = (numVerlets: number): controlPanel => {
	const nVerletEle = document.getElementById("num-verlets") as HTMLDivElement
	nVerletEle.textContent = numVerlets.toString()

	const incrButtons = document.querySelectorAll("#incr-btn")

	const colorTable = document.getElementById("color-table") as HTMLDivElement

	const header = document.createElement("tr")

	const col = document.createElement("td")
	col.setAttribute("class", "color-matrix-cell")
	header.appendChild(col)

	Object.values(colors).forEach((color) => {
		const col = document.createElement("td")
		col.setAttribute("class", "color-matrix-cell")
		col.setAttribute("style", `background-color: ${COLOR_NAMES[color.string]}`)
		header.appendChild(col)
	})

	colorTable.appendChild(header)

	const colorIndices: Record<string, number> = {}
	const colorCheckboxes: Array<HTMLInputElement> = []

	Object.values(colors).forEach((color) => {
		const turnedOn = Math.random() >= .5
		if (turnedOn) {
			if (!colorIndices[color.string]) {
				colorIndices[color.string] = Object.keys(colorIndices).length
			}
		}

		const row = document.createElement("tr")

		const col = document.createElement("td")
		col.setAttribute("class", "color-matrix-cell")
		col.setAttribute("style", `background-color: ${COLOR_NAMES[color.string]}; align-items: center; display: flex; justify-content: center;`)

		const checkbox = document.createElement("input")
		checkbox.setAttribute("id", `checkbox-${COLOR_NAMES[color.string]}`)
		checkbox.setAttribute("type", "checkbox")
		checkbox.checked = turnedOn
		col.appendChild(checkbox)
		colorCheckboxes.push(checkbox)

		row.appendChild(col)

		Object.values(colors).forEach((_color) => {
			const col = document.createElement("td")
			col.setAttribute("class", "color-matrix-cell")
			col.setAttribute("id", `behaviour-${COLOR_NAMES[color.string]}-${COLOR_NAMES[_color.string]}`)
			row.appendChild(col)
		})

		colorTable.appendChild(row)
	})

	const behaviourMatrix: Array<Array<number>> = [...Array(Object.keys(colorIndices).length)].map(() => [])
	Object.entries(colorIndices).forEach(([colorStr, idx]) => {
		Object.entries(colorIndices).forEach(([_colorStr, _idx]) => {
			behaviourMatrix[idx][_idx] = randInt(-5, 5)
			const cell = document.getElementById(`behaviour-${COLOR_NAMES[colorStr]}-${COLOR_NAMES[_colorStr]}`)
			if (cell) cell.textContent = behaviourMatrix[idx][_idx].toString()
		})
	})

	return {
		nVerletEle,
		incrButtons,
		colorCheckboxes,
		behaviourMatrix,
		colorIndices
	}
}
