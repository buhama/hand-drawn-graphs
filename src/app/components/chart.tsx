"use client"

import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import rough from 'roughjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Papa from 'papaparse'
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function Component() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [rawData, setRawData] = useState<any[]>([])
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [xColumn, setXColumn] = useState<string | null>(null)
  const [yColumn, setYColumn] = useState<string | null>(null)
  const [chartType, setChartType] = useState<string>('Line')
  const [chartTitle, setChartTitle] = useState<string>('')
  const { theme, setTheme } = useTheme()
  const [showControls, setShowControls] = useState(true)
  const [showDummyData, setShowDummyData] = useState(false)

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const { width } = svgRef.current.getBoundingClientRect()
        setDimensions({ width, height: 400 }) // Increased height to 400
      }
    }

    window.addEventListener('resize', updateDimensions)
    updateDimensions()

    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!dimensions.width || !svgRef.current || data.length === 0 || !xColumn || !yColumn) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous content

    const rc = rough.svg(svg.node() as SVGSVGElement)

    // Update getRandomColor function to consider the theme
    const getRandomColor = () => {
      const hue = Math.random() * 360
      const saturation = theme === 'dark' ? '60%' : '70%'
      const lightness = theme === 'dark' ? '60%' : '50%'
      return `hsl(${hue}, ${saturation}, ${lightness})`
    }

    if (chartType === 'Pie') {
      const width = dimensions.width
      const height = dimensions.height
      const radius = Math.min(width, height) / 2 - 40

      const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)

      const color = d3.scaleOrdinal()
        .domain(data.map(d => d[xColumn]))
        .range(d3.schemeTableau10)

      const pie = d3.pie<any>()
        .value(d => d[yColumn])

      const arc = d3.arc<d3.PieArcDatum<any>>()
        .innerRadius(0)
        .outerRadius(radius)

      const arcs = pie(data)

      arcs.forEach(d => {
        const path = arc(d)
        if (path) {
          const node = rc.path(path, {
            fill: color(d.data[xColumn]) as string,
            stroke: 'none',
            roughness: 1.5,
            fillStyle: 'solid',
          })
          g.node()?.appendChild(node)
        }
      })

      // Add labels
      g.selectAll('text')
        .data(arcs)
        .enter()
        .append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('dy', '0.35em')
        .style("font-family", "Comic Sans MS, cursive")
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .text(d => d.data[xColumn])

      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "absolute bg-background border border-primary p-2 rounded shadow invisible")
        .style("font-family", "Comic Sans MS, cursive")

      g.selectAll("path")
        .data(arcs)
        .on("mouseover", (event, d) => {
          tooltip.transition()
            .duration(200)
            .style("opacity", .9)
          tooltip.html(`${xColumn}: ${d.data[xColumn]}<br>${yColumn}: ${d.data[yColumn]}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("visibility", "visible")
        })
        .on("mouseout", () => {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0)
            .style("visibility", "hidden")
        })

    } else {
      const margin = { top: 20, right: 30, bottom: 50, left: 60 }
      const width = dimensions.width - margin.left - margin.right
      const height = dimensions.height - margin.top - margin.bottom

      const x = d3.scaleBand()
        .domain(data.map(d => d[xColumn]))
        .range([0, width])
        .padding(0.1)

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yColumn]) as number])
        .nice()
        .range([height, 0])

      const color = d3.scaleOrdinal()
        .domain(data.map(d => d[xColumn]))
        .range(d3.schemeTableau10)

      // Create a group for the chart content
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

      // Calculate the number of ticks that can fit without overlapping
      const maxLabelWidth = 50; // approximate max width per label
      const numTicks = Math.max(Math.floor(width / maxLabelWidth), 1);
      const totalTicks = x.domain().length;
      const tickValues = x.domain().filter((d, i) => {
        const skip = Math.ceil(totalTicks / numTicks);
        return i % skip === 0;
      });

      // Draw x-axis
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickValues(tickValues))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").remove())
        .call(g => g.selectAll(".tick text")
          .attr("class", "text-xs text-muted-foreground")
          .style("font-family", "Comic Sans MS, cursive")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end"))

      // Draw y-axis
      g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").remove())
        .call(g => g.selectAll(".tick text")
          .attr("class", "text-xs text-muted-foreground")
          .style("font-family", "Comic Sans MS, cursive"))

      if (chartType === 'Line') {
        // Generate a random color for the line
        const lineColor = getRandomColor()

        // Draw the line
        const lineGenerator = d3.line<any>()
          .x(d => x(d[xColumn])! + x.bandwidth() / 2)
          .y(d => y(d[yColumn]))

        const linePath = lineGenerator(data)
        if (linePath) {
          g.node()?.appendChild(
            rc.path(linePath, {
              stroke: lineColor, // Use the random color here
              strokeWidth: 2,
              roughness: 1.5,
              fillStyle: 'solid',
            })
          )
        }

        // Draw dots
        data.forEach(d => {
          g.node()?.appendChild(
            rc.circle(
              x(d[xColumn])! + x.bandwidth() / 2,
              y(d[yColumn]),
              6,
              {
                fill: lineColor, // Use the same random color for dots
                fillStyle: 'solid',
                stroke: 'none',
                roughness: 1.5,
              }
            )
          )
        })

        // Add hover effects and tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "absolute bg-background border border-primary p-2 rounded shadow invisible")
          .style("font-family", "Comic Sans MS, cursive")

        g.selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("cx", d => x(d[xColumn])! + x.bandwidth() / 2)
          .attr("cy", d => y(d[yColumn]))
          .attr("r", 6)
          .attr("fill", "transparent")
          .on("mouseover", (event, d) => {
            tooltip.transition()
              .duration(200)
              .style("opacity", .9)
            tooltip.html(`${xColumn}: ${d[xColumn]}<br>${yColumn}: ${d[yColumn]}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px")
              .style("visibility", "visible")
          })
          .on("mouseout", () => {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0)
              .style("visibility", "hidden")
          })

      } else if (chartType === 'Bar') {
        data.forEach(d => {
            const xPos = x(d[xColumn])!
            const yPos = y(d[yColumn])
            const barHeight = height - yPos
            const barWidth = x.bandwidth()
  
            // Create the main rectangle
            const rect = rc.rectangle(xPos, yPos, barWidth, barHeight, {
              fill: color(d[xColumn]) as string,
              fillStyle: 'zigzag',
              stroke: 'black',
              strokeWidth: 2,
              roughness: 1.5,
              hachureAngle: 60,
              hachureGap: 4,
            })
            g.node()?.appendChild(rect)
  
            // Add a slightly offset duplicate rectangle for a shadow effect
            const shadowRect = rc.rectangle(xPos + 2, yPos + 2, barWidth, barHeight, {
              fill: 'none',
              stroke: theme === 'dark' ? '#ffffff' : '#000000',
              strokeWidth: 1,
              roughness: 1.5,
            })
            g.node()?.appendChild(shadowRect)
          })
  
          // Add hover effects and tooltip
          const tooltip = d3.select("body").append("div")
            .attr("class", "absolute bg-background border border-primary p-2 rounded shadow invisible")
            .style("font-family", "Comic Sans MS, cursive")
  
          g.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => x(d[xColumn])!)
            .attr("y", d => y(d[yColumn]))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d[yColumn]))
            .attr("fill", "transparent")
            .on("mouseover", (event, d) => {
              tooltip.transition()
                .duration(200)
                .style("opacity", .9)
              tooltip.html(`${xColumn}: ${d[xColumn]}<br>${yColumn}: ${d[yColumn]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("visibility", "visible")
            })
            .on("mouseout", () => {
              tooltip.transition()
                .duration(500)
                .style("opacity", 0)
                .style("visibility", "hidden")
            })
      }
    }

    // Add chart title
    svg.append("text")
      .attr("x", dimensions.width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-family", "Comic Sans MS, cursive")
      .style("font-size", "18px")
      .style("fill", theme === 'dark' ? '#ffffff' : '#000000')
      .text(chartTitle)

    // Update text color based on theme
    const textColor = theme === 'dark' ? '#ffffff' : '#000000'

    // Update text color for axes and labels
    svg.selectAll('text')
      .style('fill', textColor)

    // Update tooltip styles
    const tooltip = d3.select("body").append("div")
      .attr("class", `absolute ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'} border border-primary p-2 rounded shadow invisible`)
      .style("font-family", "Comic Sans MS, cursive")

  }, [dimensions, data, xColumn, yColumn, chartType, theme, chartTitle])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Reset state before parsing new file
      setRawData([])
      setData([])
      setColumns([])
      setXColumn(null)
      setYColumn(null)
      setChartTitle('')
      setShowDummyData(false)

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const parsedColumns = results.meta.fields as string[];
          setColumns(parsedColumns);
          setRawData(results.data as any[]);
          // Set default xColumn and yColumn
          if (parsedColumns.length >= 2) {
            setXColumn(parsedColumns[0]);
            setYColumn(parsedColumns[1]);
          }
        },
      })
    }
    // Reset the file input
    if (event.target) {
      event.target.value = ''
    }
  }

  useEffect(() => {
    if (xColumn && yColumn && rawData.length > 0) {
      const parsedData = rawData
        .map((row: any) => ({
          [xColumn]: row[xColumn],
          [yColumn]: parseFloat(row[yColumn])
        }))
        .filter((d: any) => !isNaN(d[yColumn]) && d[xColumn] !== undefined && d[xColumn] !== null)
      setData(parsedData)
    }
  }, [xColumn, yColumn, rawData])

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const generateDummyData = () => {
    const dummyData = [
      { month: 'Jan', sales: 120, profit: 20 },
      { month: 'Feb', sales: 150, profit: 25 },
      { month: 'Mar', sales: 200, profit: 35 },
      { month: 'Apr', sales: 180, profit: 30 },
      { month: 'May', sales: 250, profit: 45 },
      { month: 'Jun', sales: 300, profit: 55 },
    ]
    setRawData(dummyData)
    setColumns(['month', 'sales', 'profit'])
    setXColumn('month')
    setYColumn('sales')
    setChartTitle('Monthly Sales')
    setShowDummyData(true)
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Hand-Drawn Chart</CardTitle>
            <CardDescription>Import CSV to visualize data with a sketchy appearance</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowControls(!showControls)}
            >
              {showControls ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              <span className="sr-only">Toggle controls</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunIcon className="h-[1.2rem] w-[1.2rem]" /> : <MoonIcon className="h-[1.2rem] w-[1.2rem]" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showControls && (
          <>
            <div className="mb-4 flex space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="csv-upload"
              />
              <Button onClick={triggerFileInput}>
                Import CSV
              </Button>
              <Button onClick={generateDummyData}>
                Show Example
              </Button>
            </div>
            {columns.length > 0 && (
              <div className="mb-4 space-y-4">
                <div>
                  <label htmlFor="chart-title" className="block text-sm font-medium text-muted-foreground mb-2">Chart Title:</label>
                  <Input
                    id="chart-title"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="Enter chart title"
                    className="max-w-md"
                  />
                </div>
                <div className="flex space-x-4">
                  <div>
                    <label htmlFor="chart-type-select" className="block text-sm font-medium text-muted-foreground mb-2">Chart Type:</label>
                    <Select value={chartType} onValueChange={(value) => setChartType(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Line">Line Chart</SelectItem>
                        <SelectItem value="Bar">Bar Chart</SelectItem>
                        <SelectItem value="Pie">Pie Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="x-axis-select" className="block text-sm font-medium text-muted-foreground mb-2">X-Axis:</label>
                    <Select value={xColumn || ''} onValueChange={(value) => setXColumn(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select X-Axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="y-axis-select" className="block text-sm font-medium text-muted-foreground mb-2">Y-Axis:</label>
                    <Select value={yColumn || ''} onValueChange={(value) => setYColumn(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Y-Axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div className="w-full h-[400px] mt-10"> {/* Changed height from 300px to 400px */}
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </CardContent>
    </Card>
  )
}