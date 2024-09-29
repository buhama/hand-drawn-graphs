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
        const height = window.innerWidth < 640 ? 300 : 400 // Adjust height for mobile
        setDimensions({ width, height })
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
          .defined(d => !isNaN(d[yColumn])) // Add this line to handle undefined or NaN values

        const linePath = lineGenerator(data)
        if (linePath) {
          try {
            g.node()?.appendChild(
              rc.path(linePath, {
                stroke: lineColor,
                strokeWidth: 2,
                roughness: 1.5,
                fillStyle: 'solid',
              })
            )
          } catch (error) {
            console.error("Error drawing line path:", error)
          }
        }

        // Draw dots
        data.forEach(d => {
          if (!isNaN(d[yColumn])) {
            try {
              g.node()?.appendChild(
                rc.circle(
                  x(d[xColumn])! + x.bandwidth() / 2,
                  y(d[yColumn]),
                  6,
                  {
                    fill: lineColor,
                    fillStyle: 'solid',
                    stroke: 'none',
                    roughness: 1.5,
                  }
                )
              )
            } catch (error) {
              console.error("Error drawing circle:", error)
            }
          }
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

  function generateDummyData() {
    const datasets = [
      {
        data: [
          { Year: 2010, GlobalTemperature: 14.9 },
          { Year: 2011, GlobalTemperature: 14.8 },
          { Year: 2012, GlobalTemperature: 14.9 },
          { Year: 2013, GlobalTemperature: 14.9 },
          { Year: 2014, GlobalTemperature: 15.0 },
          { Year: 2015, GlobalTemperature: 15.1 },
          { Year: 2016, GlobalTemperature: 15.3 },
          { Year: 2017, GlobalTemperature: 15.2 },
          { Year: 2018, GlobalTemperature: 15.2 },
          { Year: 2019, GlobalTemperature: 15.3 },
          { Year: 2020, GlobalTemperature: 15.4 },
        ],
        columns: ['Year', 'GlobalTemperature'],
        xColumn: 'Year',
        yColumn: 'GlobalTemperature',
        chartTitle: 'Global Average Temperature Over Years',
      },
      {
        data: [
          { Country: 'China', Population: 1444216107 },
          { Country: 'India', Population: 1393409038 },
          { Country: 'USA', Population: 331893745 },
          { Country: 'Indonesia', Population: 273523621 },
          { Country: 'Pakistan', Population: 220892331 },
        ],
        columns: ['Country', 'Population'],
        xColumn: 'Country',
        yColumn: 'Population',
        chartTitle: 'Population of Top 5 Most Populous Countries',
      },
      {
        data: [
          { Continent: 'Asia', Area: 44579000 },
          { Continent: 'Africa', Area: 30370000 },
          { Continent: 'North America', Area: 24709000 },
          { Continent: 'South America', Area: 17840000 },
          { Continent: 'Antarctica', Area: 14000000 },
          { Continent: 'Europe', Area: 10180000 },
          { Continent: 'Australia', Area: 8600000 },
        ],
        columns: ['Continent', 'Area'],
        xColumn: 'Continent',
        yColumn: 'Area',
        chartTitle: 'Area of Continents (in km²)',
      },
      {
        data: [
          { Year: '2016', OlympicMedals: 121 },
          { Year: '2012', OlympicMedals: 104 },
          { Year: '2008', OlympicMedals: 112 },
          { Year: '2004', OlympicMedals: 101 },
          { Year: '2000', OlympicMedals: 93 },
        ],
        columns: ['Year', 'OlympicMedals'],
        xColumn: 'Year',
        yColumn: 'OlympicMedals',
        chartTitle: 'USA Olympic Medals Over Years',
      },
      {
        data: [
          { Planet: 'Mercury', DistanceFromSun: 57.9 },
          { Planet: 'Venus', DistanceFromSun: 108.2 },
          { Planet: 'Earth', DistanceFromSun: 149.6 },
          { Planet: 'Mars', DistanceFromSun: 227.9 },
          { Planet: 'Jupiter', DistanceFromSun: 778.6 },
        ],
        columns: ['Planet', 'DistanceFromSun'],
        xColumn: 'Planet',
        yColumn: 'DistanceFromSun',
        chartTitle: 'Distance of Planets from the Sun (in million km)',
      },
    ];
  
    // Randomly select a dataset
    const randomIndex = Math.floor(Math.random() * datasets.length);
    const selectedDataset = datasets[randomIndex];
  
    setRawData(selectedDataset.data);
    setColumns(selectedDataset.columns);
    setXColumn(selectedDataset.xColumn);
    setYColumn(selectedDataset.yColumn);
    setChartTitle(selectedDataset.chartTitle);
    setShowDummyData(true);
  }
  
  

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
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
            <div className="mb-4 flex flex-wrap gap-2">
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
                    className="max-w-full sm:max-w-md"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-auto">
                    <label htmlFor="chart-type-select" className="block text-sm font-medium text-muted-foreground mb-2">Chart Type:</label>
                    <Select value={chartType} onValueChange={(value) => setChartType(value)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Line">Line Chart</SelectItem>
                        <SelectItem value="Bar">Bar Chart</SelectItem>
                        <SelectItem value="Pie">Pie Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor="x-axis-select" className="block text-sm font-medium text-muted-foreground mb-2">X-Axis:</label>
                    <Select value={xColumn || ''} onValueChange={(value) => setXColumn(value)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select X-Axis" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor="y-axis-select" className="block text-sm font-medium text-muted-foreground mb-2">Y-Axis:</label>
                    <Select value={yColumn || ''} onValueChange={(value) => setYColumn(value)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
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
        <div className="w-full h-[300px] sm:h-[400px] mt-10">
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </CardContent>
    </Card>
  )
}