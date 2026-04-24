import express from "express"
import cors from "cors"
import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'db.json')

const app = express()
app.use(cors())
app.use(express.json())

// Load DB
let tasksByProfile = {}
if (fs.existsSync(DB_FILE)) {
    try {
        tasksByProfile = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
    } catch (e) {
        console.error("Failed to load DB file", e)
    }
}

const saveDb = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(tasksByProfile, null, 2))
}

app.get("/tasks/:profileId", (req, res) => {
    res.json(tasksByProfile[req.params.profileId] || [])
})

// Helper to get ISO string
const getIso = () => new Date().toISOString()

app.post("/tasks/:profileId", (req, res) => {
    const profileId = req.params.profileId
    const incomingData = req.body

    // 1. Get Existing
    const existingData = tasksByProfile[profileId] || { tasks: [], preferences: {}, theme: {} }

    // 2. Merge Preferences & Theme (Last-Write-Wins is acceptable here for now)
    const mergedPreferences = { ...existingData.preferences, ...incomingData.preferences }
    const mergedTheme = { ...existingData.theme, ...incomingData.theme }

    // 3. ATOMIC MERGE FOR TASKS (Merge-by-ID)
    const incomingTasks = incomingData.tasks || []
    const existingTasks = existingData.tasks || []

    const taskMap = {}

    // Index existing
    existingTasks.forEach(t => { taskMap[t.id] = t })

    // Merge incoming
    incomingTasks.forEach(t => {
        const existing = taskMap[t.id]

        // If task is new OR has a newer timestamp, update it
        // If timestamps are equal, we can default to incoming (or keep existing, doesnt matter much if identical)
        if (!existing || !existing.updatedAt || (t.updatedAt && new Date(t.updatedAt) > new Date(existing.updatedAt))) {
            taskMap[t.id] = t
        }
    })

    // 4. Construct Result
    tasksByProfile[profileId] = {
        updatedAt: getIso(),
        preferences: mergedPreferences,
        theme: mergedTheme,
        tasks: Object.values(taskMap)
    }

    saveDb()
    res.json(tasksByProfile[profileId])
})

app.listen(3001, '0.0.0.0', () => {
    console.log("Backend running on http://0.0.0.0:3001")
})
