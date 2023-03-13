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
	chosenColors: Array<string>
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

	const colorCheckboxes: Array<HTMLInputElement> = []
	const behaviourMatrix: Array<Array<number>> = [...Array(Object.keys(colors).length)]
		.map(() => [...Array(Object.keys(colors).length)].map(() => 0))
	const colorIndices: Record<string, number> = Object.entries(colors)
		.reduce((acc, [_, v4]) => {
		if (acc[v4.string] !== undefined) return acc
		acc[v4.string] = Object.keys(acc).length
		return acc
	}, {} as Record<string, number>)
	const chosenColors: Array<string> = []

	Object.values(colors).forEach((color) => {
		const turnedOn = Math.random() >= .3
		if (turnedOn) chosenColors.push(color.string)

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
			if (turnedOn) {
				const val = randInt(-5, 5)
				behaviourMatrix[colorIndices[color.string]][colorIndices[_color.string]] = val
				col.textContent = val !== 0 ? val.toString() : ''
			}
			col.setAttribute("id", `behaviour-${COLOR_NAMES[color.string]}-${COLOR_NAMES[_color.string]}`)
			row.appendChild(col)
		})

		colorTable.appendChild(row)
	})

	return {
		nVerletEle,
		incrButtons,
		colorCheckboxes,
		behaviourMatrix,
		colorIndices,
		chosenColors
	}
}
