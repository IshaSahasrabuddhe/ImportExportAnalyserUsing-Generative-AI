// src/app/api/generate-chart/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { description, data } = await request.json();

    if (!description || !data) {
      return NextResponse.json(
        { error: "Description and data are required" },
        { status: 400 }
      );
    }

    // 🔹 Prompt for Groq
    const prompt = `
You are a data visualization expert.
Create a valid JSON Plotly.js chart configuration based on the description and dataset.

User description: "${description}"

Dataset sample (first 3 rows):
${JSON.stringify(data.slice(0, 3), null, 2)}

⚠️ Return ONLY valid JSON. Do not include explanations, markdown, or text outside the JSON.
`;

    // 🔑 Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a chart configuration generator. Output ONLY valid JSON for Plotly.js given the dataset and instructions. No text outside JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content;

    if (!aiResponse) throw new Error("No response from Groq");

    // 🔹 Sanitize + ensure valid JSON
    let chartConfig;
    try {
      let cleaned = aiResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Groq response");

      chartConfig = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Bad JSON from Groq:", aiResponse);
      throw new Error("Invalid JSON from Groq");
    }

    // 🔹 Post-process: Ensure layout exists & fix misplaced props
    chartConfig.layout = chartConfig.layout || {};

    // Move barmode into layout if it exists outside
    if (chartConfig.barmode) {
      chartConfig.layout.barmode = chartConfig.barmode;
      delete chartConfig.barmode;
    }

    // (You can add more fixes here if Groq puts other things outside layout)

    // ✅ Print full arrays instead of [Array]
    console.log(
      "✅ Final Chart Config Sent:",
      JSON.stringify(chartConfig, null, 2)
    );

    return NextResponse.json({ config: chartConfig, data });
  } catch (err: any) {
    console.error("Error generating chart:", err);
    return NextResponse.json(
      { error: "Failed to generate chart" },
      { status: 500 }
    );
  }
}
/*
// src/app/api/generate-chart/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { description, data } = await request.json();

    if (!description || !data) {
      return NextResponse.json(
        { error: "Description and data are required" },
        { status: 400 }
      );
    }

    // 🔹 Prompt for Groq
    const prompt = `
You are a data visualization expert.
Create a valid JSON Plotly.js chart configuration based on the description and dataset.

User description: "${description}"

Dataset sample (first 3 rows):
${JSON.stringify(data.slice(0, 3), null, 2)}

⚠️ Return ONLY valid JSON. Do not include explanations, markdown, or text outside the JSON.
`;

    // 🔑 Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // ✅ supported Groq model
          messages: [
            {
              role: "system",
              content:
                "You are a chart configuration generator. Output ONLY valid JSON for Plotly.js given the dataset and instructions. No text outside JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content;

    if (!aiResponse) throw new Error("No response from Groq");

    // 🔹 Sanitize + ensure valid JSON
    let chartConfig;
    try {
      let cleaned = aiResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/); // extract first {...} block
      if (!jsonMatch) {
        throw new Error("No JSON found in Groq response");
      }

      chartConfig = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Bad JSON from Groq:", aiResponse);
      throw new Error("Invalid JSON from Groq");
    }

    // ✅ Print full arrays instead of [Array]
    console.log(
      "✅ Final Chart Config Sent:",
      JSON.stringify(chartConfig, null, 2)
    );

    return NextResponse.json({ config: chartConfig, data });
  } catch (err: any) {
    console.error("Error generating chart:", err);
    return NextResponse.json(
      { error: "Failed to generate chart" },
      { status: 500 }
    );
  }
}
*/
/*------------------------------------------------------------------------------------------*/


/*import { NextRequest, NextResponse } from "next/server"

// Simple in-memory cache (description+data → config)
const chartCache = new Map<string, any>()

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000) {
  for (let i = 0; i <= retries; i++) {
    const response = await fetch(url, options)

    if (response.ok) return response

    if (response.status === 429 && i < retries) {
      console.warn(`429 Too Many Requests — retrying in ${backoff}ms (attempt ${i + 1})`)
      await new Promise((res) => setTimeout(res, backoff))
      backoff *= 2 // Exponential increase
      continue
    }

    // If not 429 or retries exhausted, throw error
    const errText = await response.text()
    throw new Error(`ZAI API error: ${response.status} ${response.statusText} - ${errText}`)
  }

  throw new Error("Max retries reached for API call")
}

export async function POST(request: NextRequest) {
  try {
    const { description, data } = await request.json()

    if (!description || !data) {
      return NextResponse.json(
        { error: "Description and data are required" },
        { status: 400 }
      )
    }

    // Create cache key (unique per description+data)
    const cacheKey = JSON.stringify({ description, data })
    if (chartCache.has(cacheKey)) {
      console.log("✅ Returning cached chart config")
      return NextResponse.json({ config: chartCache.get(cacheKey), data })
    }

    // Build the prompt
    const prompt = `
You are a data visualization expert. Based on the user's description and the provided import/export data, generate a Plotly.js chart configuration.

User description: "${description}"

Available data fields: Date, Shipment_ID, Product, Quantity, Price_per_unit, Currency, Market_Impact_Score, Delay_in_days, Risk_Score, Profit, Cost, Anomaly

Sample data structure:
${JSON.stringify(data.slice(0, 3), null, 2)}

Generate only a valid JSON object with this structure:
{
  "chartType": "...",
  "title": "...",
  "xAxis": "...",
  "yAxis": "...",
  "aggregation": "...",
  "groupBy": "...",
  "filters": "...",
  "colorScheme": "..."
}
`

    // 🔑 API call with retry
    const response = await fetchWithRetry(
      "https://api.z.ai/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
          "Content-Type": "application/json",
          "Accept-Language": "en-US,en",
        },
        body: JSON.stringify({
          model: "glm-4.5", // from docs
          messages: [
            { role: "system", content: "You are a data visualization expert." },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 500,
        }),
      }
    )

    const result = await response.json()
    const aiResponse = result.choices?.[0]?.message?.content

    if (!aiResponse) throw new Error("No response from Z.AI")

    let chartConfig
    try {
      chartConfig = JSON.parse(aiResponse.trim())
    } catch {
      throw new Error("Invalid JSON from Z.AI")
    }

    // Cache result
    chartCache.set(cacheKey, chartConfig)

    return NextResponse.json({ config: chartConfig, data })
  } catch (err: any) {
    console.error("Error generating chart:", err)
    return NextResponse.json(
      { error: "Failed to generate chart", details: err.message },
      { status: 500 }
    )
  }
}
*/
/*-------------------------------------------------------------------------------------------------------------------------------
*/

/*import 'dotenv/config'
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
// server.ts (top)



export async function POST(request: NextRequest) {
  try {
    const { description, data } = await request.json()
    
    if (!description || !data) {
      return NextResponse.json(
        { error: 'Description and data are required' },
        { status: 400 }
      )
    }

    // Initialize ZAI
   
    // Initialize ZAI with inline config from environment variables
      const zai = await ZAI.create({
  apiKey: process.env.ZAI_API_KEY as string,
  endpoint: process.env.ZAI_ENDPOINT || "https://api.z.ai/api/paas/v4/"
});



    // Create a prompt for the AI to generate chart configuration
    const prompt = `
You are a data visualization expert. Based on the user's description and the provided import/export data, generate a Plotly.js chart configuration.

User description: "${description}"

Available data fields: Date, Shipment_ID, Product, Quantity, Price_per_unit, Currency, Market_Impact_Score, Delay_in_days, Risk_Score, Profit, Cost, Anomaly

Sample data structure:
${JSON.stringify(data.slice(0, 3), null, 2)}

Generate a JSON response with the following structure:
{
  "chartType": "pie|bar|line|scatter|histogram",
  "title": "Chart title",
  "xAxis": "Field name for x-axis or category labels",
  "yAxis": "Field name for y-axis or values",
  "aggregation": "sum|average|count|null (if no aggregation needed)",
  "groupBy": "Field name to group by (if applicable)",
  "filters": "Any specific filters to apply (if applicable)",
  "colorScheme": "Color scheme suggestion"
}

Respond only with the JSON object, no additional text.
`

    // Get AI response
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a data visualization expert that generates chart configurations based on natural language descriptions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse the AI response
    let chartConfig
    try {
      // Clean the AI response - remove markdown code blocks if present
      let cleanResponse = aiResponse.trim()
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      chartConfig = JSON.parse(cleanResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Invalid AI response format')
    }

    // Generate the actual chart data based on the AI configuration
    const chartData = generateChartData(chartConfig, data)

    return NextResponse.json({
      config: chartConfig,
      data: chartData
    })

  } catch (error) {
    console.error('Error generating chart:', error)
    return NextResponse.json(
      { error: 'Failed to generate chart' },
      { status: 500 }
    )
  }
}

function generateChartData(config: any, data: any[]) {
  const { chartType, xAxis, yAxis, aggregation, groupBy } = config

  // Apply any filters if specified
  let filteredData = data
  if (config.filters) {
    // Simple filter implementation - can be enhanced
    try {
      const filterObj = JSON.parse(config.filters)
      filteredData = data.filter(item => {
        return Object.entries(filterObj).every(([key, value]) => item[key] === value)
      })
    } catch (e) {
      // If filters are not valid JSON, ignore them
    }
  }

  switch (chartType) {
    case 'pie':
      return generatePieChart(filteredData, xAxis, yAxis, aggregation)
    case 'bar':
      return generateBarChart(filteredData, xAxis, yAxis, aggregation, groupBy)
    case 'line':
      return generateLineChart(filteredData, xAxis, yAxis, aggregation, groupBy)
    case 'scatter':
      return generateScatterChart(filteredData, xAxis, yAxis)
    case 'histogram':
      return generateHistogram(filteredData, xAxis)
    default:
      return generateBarChart(filteredData, xAxis, yAxis, aggregation, groupBy)
  }
}

function generatePieChart(data: any[], labelField: string, valueField: string, aggregation: string) {
  const grouped: { [key: string]: number } = {}
  
  data.forEach(item => {
    const key = item[labelField]
    const value = parseFloat(item[valueField]) || 0
    
    if (!grouped[key]) {
      grouped[key] = 0
    }
    
    if (aggregation === 'sum') {
      grouped[key] += value
    } else if (aggregation === 'average') {
      grouped[key] = (grouped[key] || 0) + value
    } else if (aggregation === 'count') {
      grouped[key] += 1
    }
  })

  // Calculate average if needed
  if (aggregation === 'average') {
    const counts: { [key: string]: number } = {}
    data.forEach(item => {
      const key = item[labelField]
      counts[key] = (counts[key] || 0) + 1
    })
    Object.keys(grouped).forEach(key => {
      grouped[key] = grouped[key] / counts[key]
    })
  }

  return [{
    type: 'pie',
    labels: Object.keys(grouped),
    values: Object.values(grouped),
    marker: { colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'] }
  }]
}

function generateBarChart(data: any[], xField: string, yField: string, aggregation: string, groupBy?: string) {
  if (groupBy) {
    // Grouped bar chart
    const groups: { [key: string]: { [subkey: string]: number } } = {}
    const groupKeys = new Set<string>()
    
    data.forEach(item => {
      const group = item[groupBy]
      const key = item[xField]
      const value = parseFloat(item[yField]) || 0
      
      groupKeys.add(key)
      
      if (!groups[group]) {
        groups[group] = {}
      }
      if (!groups[group][key]) {
        groups[group][key] = 0
      }
      
      if (aggregation === 'sum') {
        groups[group][key] += value
      } else if (aggregation === 'average') {
        groups[group][key] = (groups[group][key] || 0) + value
      } else if (aggregation === 'count') {
        groups[group][key] += 1
      }
    })

    // Calculate averages if needed
    if (aggregation === 'average') {
      const counts: { [key: string]: { [subkey: string]: number } } = {}
      data.forEach(item => {
        const group = item[groupBy]
        const key = item[xField]
        if (!counts[group]) counts[group] = {}
        if (!counts[group][key]) counts[group][key] = 0
        counts[group][key] += 1
      })
      
      Object.keys(groups).forEach(group => {
        Object.keys(groups[group]).forEach(key => {
          groups[group][key] = groups[group][key] / counts[group][key]
        })
      })
    }

    const traces = Object.keys(groups).map((group, index) => ({
      type: 'bar',
      name: group,
      x: Array.from(groupKeys),
      y: Array.from(groupKeys).map(key => groups[group][key] || 0),
      marker: { color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6] }
    }))

    return traces
  } else {
    // Simple bar chart
    const grouped: { [key: string]: number } = {}
    
    data.forEach(item => {
      const key = item[xField]
      const value = parseFloat(item[yField]) || 0
      
      if (!grouped[key]) {
        grouped[key] = 0
      }
      
      if (aggregation === 'sum') {
        grouped[key] += value
      } else if (aggregation === 'average') {
        grouped[key] = (grouped[key] || 0) + value
      } else if (aggregation === 'count') {
        grouped[key] += 1
      }
    })

    // Calculate average if needed
    if (aggregation === 'average') {
      const counts: { [key: string]: number } = {}
      data.forEach(item => {
        const key = item[xField]
        counts[key] = (counts[key] || 0) + 1
      })
      Object.keys(grouped).forEach(key => {
        grouped[key] = grouped[key] / counts[key]
      })
    }

    return [{
      type: 'bar',
      x: Object.keys(grouped),
      y: Object.values(grouped),
      marker: { color: '#3B82F6' }
    }]
  }
}

function generateLineChart(data: any[], xField: string, yField: string, aggregation: string, groupBy?: string) {
  if (groupBy) {
    // Multiple lines
    const groups: { [key: string]: { [x: string]: number } } = {}
    const allXValues = new Set<string>()
    
    data.forEach(item => {
      const group = item[groupBy]
      const x = item[xField]
      const value = parseFloat(item[yField]) || 0
      
      allXValues.add(x)
      
      if (!groups[group]) {
        groups[group] = {}
      }
      if (!groups[group][x]) {
        groups[group][x] = 0
      }
      
      if (aggregation === 'sum') {
        groups[group][x] += value
      } else if (aggregation === 'average') {
        groups[group][x] = (groups[group][x] || 0) + value
      } else if (aggregation === 'count') {
        groups[group][x] += 1
      }
    })

    // Calculate averages if needed
    if (aggregation === 'average') {
      const counts: { [key: string]: { [x: string]: number } } = {}
      data.forEach(item => {
        const group = item[groupBy]
        const x = item[xField]
        if (!counts[group]) counts[group] = {}
        if (!counts[group][x]) counts[group][x] = 0
        counts[group][x] += 1
      })
      
      Object.keys(groups).forEach(group => {
        Object.keys(groups[group]).forEach(x => {
          groups[group][x] = groups[group][x] / counts[group][x]
        })
      })
    }

    const sortedXValues = Array.from(allXValues).sort()
    
    return Object.keys(groups).map((group, index) => ({
      type: 'scatter',
      mode: 'lines+markers',
      name: group,
      x: sortedXValues,
      y: sortedXValues.map(x => groups[group][x] || 0),
      line: { color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6] },
      marker: { color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6] }
    }))
  } else {
    // Single line
    const grouped: { [x: string]: number } = {}
    
    data.forEach(item => {
      const x = item[xField]
      const value = parseFloat(item[yField]) || 0
      
      if (!grouped[x]) {
        grouped[x] = 0
      }
      
      if (aggregation === 'sum') {
        grouped[x] += value
      } else if (aggregation === 'average') {
        grouped[x] = (grouped[x] || 0) + value
      } else if (aggregation === 'count') {
        grouped[x] += 1
      }
    })

    // Calculate average if needed
    if (aggregation === 'average') {
      const counts: { [x: string]: number } = {}
      data.forEach(item => {
        const x = item[xField]
        counts[x] = (counts[x] || 0) + 1
      })
      Object.keys(grouped).forEach(x => {
        grouped[x] = grouped[x] / counts[x]
      })
    }

    const sortedXValues = Object.keys(grouped).sort()
    
    return [{
      type: 'scatter',
      mode: 'lines+markers',
      x: sortedXValues,
      y: sortedXValues.map(x => grouped[x]),
      line: { color: '#3B82F6' },
      marker: { color: '#3B82F6' }
    }]
  }
}

function generateScatterChart(data: any[], xField: string, yField: string) {
  return [{
    type: 'scatter',
    mode: 'markers',
    x: data.map(item => parseFloat(item[xField]) || 0),
    y: data.map(item => parseFloat(item[yField]) || 0),
    marker: { 
      color: '#3B82F6',
      size: 8
    }
  }]
}

function generateHistogram(data: any[], field: string) {
  const values = data.map(item => parseFloat(item[field]) || 0)
  
  return [{
    type: 'histogram',
    x: values,
    marker: { color: '#3B82F6' }
  }]
}
  */