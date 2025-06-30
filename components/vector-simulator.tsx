"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import {
  HelpCircle,
  CheckCircle2,
  Target,
  MousePointer,
  Maximize2,
  Lightbulb,
  Trophy,
  BookOpen,
  Info,
  Clock,
  Zap,
  RotateCcw,
  Move,
  Compass,
  Ruler,
  Brain,
  ThumbsUp,
  AlertCircle,
  BarChart3,
  ArrowRight,
  ArrowUp,
  ChevronUp,
  ChevronDown,
  Globe,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define vector type
type Vector = {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  angleReference?: "x" | "y" // Which axis the angle is measured from
  angleLabelDistance?: number // Distance multiplier for angle label positioning
  angleLabelPosition?: { x: number; y: number } // Custom position for the angle label
}

// Define direction quadrant type
type DirectionQuadrant = "NE" | "SE" | "SW" | "NW" | "Not sure"

// Define magnitude range type
type MagnitudeRange = "< 50 N" | "50-100 N" | "100-150 N" | "> 150 N" | "Not sure"

// Define challenge type
type Challenge = {
  id: number
  description: string
  objective: string
  checkCompletion: (resultant: ResultantVector) => boolean
  feedback: string
  explanation: string
  hint: string
  completed: boolean
  difficulty: "easy" | "medium" | "hard"
  learningOutcome: string
  realWorldExample: string
}

// Define resultant vector type
type ResultantVector = {
  x: number
  y: number
  magnitude: number
  angle: number
}

export default function VectorSimulator() {
  const isMobile = useMobile()
  const { toast } = useToast()

  // Canvas dimensions
  const canvasWidth = 700
  const canvasHeight = 400
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  // Vector colors
  const vectorColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316"]

  // State for vectors
  const [vectors, setVectors] = useState<Vector[]>([
    {
      id: 1,
      startX: centerX,
      startY: centerY,
      endX: centerX + 192,
      endY: centerY - 166,
      color: vectorColors[0],
      angleReference: "x",
      angleLabelDistance: 2.0,
    },
    {
      id: 2,
      startX: centerX,
      startY: centerY,
      endX: centerX - 175,
      endY: centerY - 102,
      color: vectorColors[1],
      angleReference: "y",
      angleLabelDistance: 2.2,
    },
    {
      id: 3,
      startX: centerX,
      startY: centerY,
      endX: centerX - 216,
      endY: centerY + 91,
      color: vectorColors[2],
      angleReference: "x",
      angleLabelDistance: 1.8,
    },
    {
      id: 4,
      startX: centerX,
      startY: centerY,
      endX: centerX + 165,
      endY: centerY + 130,
      color: vectorColors[3],
      angleReference: "y",
      angleLabelDistance: 2.5,
    },
  ])

  // State for dragging
  const [isDragging, setIsDragging] = useState(false)
  const [draggedPoint, setDraggedPoint] = useState<{ vectorId: number; isEnd: boolean; isAngleLabel?: boolean } | null>(
    null,
  )

  // State for UI interactions
  const [showSteps, setShowSteps] = useState(false)
  const [showPrediction, setShowPrediction] = useState(!isMobile)
  const [predictionSubmitted, setPredictionSubmitted] = useState(false)
  const [directionPrediction, setDirectionPrediction] = useState<DirectionQuadrant | null>(null)
  const [magnitudePrediction, setMagnitudePrediction] = useState<MagnitudeRange | null>(null)
  const [highlightedComponent, setHighlightedComponent] = useState<"x" | "y" | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<number | null>(null)
  const [showChallengeSuccess, setShowChallengeSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("vector-form")
  const [hoveredVector, setHoveredVector] = useState<number | null>(null)
  const [showPolarExplanation, setShowPolarExplanation] = useState(false)
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(["analysis"])
  const [showComponentFormulas, setShowComponentFormulas] = useState(false)
  const [predictionAccuracy, setPredictionAccuracy] = useState<"high" | "medium" | "low" | null>(null)
  const [showPredictionTips, setShowPredictionTips] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [challengeProgress, setChallengeProgress] = useState<Record<number, number>>({})
  const [showChallengeIntro, setShowChallengeIntro] = useState(false)
  const [challengeTimer, setChallengeTimer] = useState<number | null>(null)
  const [challengeStartTime, setChallengeStartTime] = useState<number | null>(null)
  const [completedChallengesCount, setCompletedChallengesCount] = useState(0)
  const [showRealWorldExample, setShowRealWorldExample] = useState(false)

  // Add these state variables after the other state declarations
  const [showDetailedCalculations, setShowDetailedCalculations] = useState(false)
  const [showResultant, setShowResultant] = useState(false)

  // Active vector id for proper z-index ordering
  const [activeVectorId, setActiveVectorId] = useState<number | null>(null)

  // Ref for tracking if vectors have been moved
  const vectorsMovedRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate resultant vector
  const resultantVector = calculateResultantVector(vectors)

  // Calculate individual vector components with accurate trigonometry
  const vectorComponents = vectors.map((vector) => {
    // Calculate vector components in Cartesian coordinates
    const dx = vector.endX - vector.startX
    const dy = vector.startY - vector.endY // Invert Y because SVG Y increases downward

    // Calculate magnitude
    const magnitude = Math.sqrt(dx * dx + dy * dy)

    // Calculate angle from positive x-axis (standard position)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    // Normalize angle to 0-360 degrees
    angle = (angle < 0 ? angle + 360 : angle) % 360

    // Determine quadrant (for reference)
    let quadrant = 1
    if (dx < 0 && dy >= 0) quadrant = 2
    else if (dx < 0 && dy < 0) quadrant = 3
    else if (dx >= 0 && dy < 0) quadrant = 4

    // Calculate reference angle based on the specified reference axis
    let angleFromRef = 0
    if (vector.angleReference === "x") {
      // Angle from x-axis
      if (quadrant === 1) angleFromRef = angle
      else if (quadrant === 2) angleFromRef = 180 - angle
      else if (quadrant === 3) angleFromRef = angle - 180
      else angleFromRef = 360 - angle
    } else {
      // Angle from y-axis
      if (quadrant === 1) angleFromRef = 90 - angle
      else if (quadrant === 2) angleFromRef = angle - 90
      else if (quadrant === 3) angleFromRef = 270 - angle
      else angleFromRef = angle - 270
    }

    // Ensure angleFromRef is positive and less than 90 degrees
    angleFromRef = Math.abs(angleFromRef % 90)

    // Direction indicators
    const xDirection = dx >= 0 ? "→" : "←"
    const yDirection = dy >= 0 ? "↑" : "↓"

    // Round values for display
    const magnitudeRounded = Math.round(magnitude)
    const angleFromRefRounded = Math.round(angleFromRef)
    const dxRounded = Math.round(Math.abs(dx))
    const dyRounded = Math.round(Math.abs(dy))

    // Determine signs for component formulas
    const xSign = dx >= 0 ? "+" : "-"
    const ySign = dy >= 0 ? "+" : "-"

    // Format component formulas based on reference axis and quadrant
    let xComponentFormula = ""
    let yComponentFormula = ""

    if (vector.angleReference === "x") {
      // When measured from x-axis
      if (quadrant === 1 || quadrant === 4) {
        // Right half-plane (positive x)
        xComponentFormula = `Fx = ${xSign} ${magnitudeRounded} cos ${angleFromRefRounded}° = ${dxRounded} N ${xDirection}`
      } else {
        // Left half-plane (negative x)
        xComponentFormula = `Fx = ${xSign} ${magnitudeRounded} cos ${angleFromRefRounded}° = ${dxRounded} N ${xDirection}`
      }

      if (quadrant === 1 || quadrant === 2) {
        // Upper half-plane (positive y)
        yComponentFormula = `Fy = ${ySign} ${magnitudeRounded} sin ${angleFromRefRounded}° = ${dyRounded} N ${yDirection}`
      } else {
        // Lower half-plane (negative y)
        yComponentFormula = `Fy = ${ySign} ${magnitudeRounded} sin ${angleFromRefRounded}° = ${dyRounded} N ${yDirection}`
      }
    } else {
      // When measured from y-axis
      if (quadrant === 1 || quadrant === 4) {
        // Right half-plane (positive x)
        xComponentFormula = `Fx = ${xSign} ${magnitudeRounded} sin ${angleFromRefRounded}° = ${dxRounded} N ${xDirection}`
      } else {
        // Left half-plane (negative x)
        xComponentFormula = `Fx = ${xSign} ${magnitudeRounded} sin ${angleFromRefRounded}° = ${dxRounded} N ${xDirection}`
      }

      if (quadrant === 1 || quadrant === 2) {
        // Upper half-plane (positive y)
        yComponentFormula = `Fy = ${ySign} ${magnitudeRounded} cos ${angleFromRefRounded}° = ${dyRounded} N ${yDirection}`
      } else {
        // Lower half-plane (negative y)
        yComponentFormula = `Fy = ${ySign} ${magnitudeRounded} cos ${angleFromRefRounded}° = ${dyRounded} N ${yDirection}`
      }
    }

    return {
      id: vector.id,
      x: dx,
      y: dy,
      magnitude,
      angle,
      angleFromRef,
      quadrant,
      xDirection,
      yDirection,
      xComponent: xComponentFormula,
      yComponent: yComponentFormula,
      xComponentFormula,
      yComponentFormula,
    }
  })

  // Add state for reflection prompt
  const [showChallengeExplanation, setShowChallengeExplanation] = useState(false)

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 1,
      description: "Adjust vectors so the resultant is nearly zero",
      objective: "Create a balanced system where all forces cancel each other out",
      checkCompletion: (resultant) => resultant.magnitude < 20,
      feedback: "Great job balancing the forces! The resultant is nearly zero.",
      explanation:
        "When forces are balanced in all directions, they cancel each other out, resulting in no net force. This is the principle of equilibrium in static systems.",
      hint: "Try to make pairs of vectors point in opposite directions with similar magnitudes.",
      completed: false,
      difficulty: "easy",
      learningOutcome: "Understanding force equilibrium and vector cancellation",
      realWorldExample:
        "A bridge in static equilibrium has multiple forces (weight, tension, compression) that sum to zero, keeping it stable.",
    },
    {
      id: 2,
      description: "Make the resultant point exactly east (0°)",
      objective: "Create a system where the net force points horizontally to the right",
      checkCompletion: (resultant) => Math.abs(resultant.angle) < 5 || Math.abs(resultant.angle - 360) < 5,
      feedback: "Perfect! The resultant is pointing east.",
      explanation:
        "You've aligned the net force along the positive x-axis by balancing the y-components while maintaining positive x-components.",
      hint: "Ensure the sum of y-components is close to zero, while keeping a positive sum of x-components.",
      completed: false,
      difficulty: "medium",
      learningOutcome: "Understanding directional control of resultant vectors",
      realWorldExample:
        "A boat crossing a river with a current needs to aim at a specific angle to travel straight east.",
    },
    {
      id: 3,
      description: "Create a resultant with magnitude > 150 N",
      objective: "Maximize the resultant force by aligning vectors constructively",
      checkCompletion: (resultant) => resultant.magnitude > 150,
      feedback: "Impressive! You've created a strong resultant force.",
      explanation:
        "By aligning multiple vectors in similar directions, you've created constructive interference that increases the total magnitude.",
      hint: "Try to align all vectors in roughly the same direction to maximize their combined effect.",
      completed: false,
      difficulty: "medium",
      learningOutcome: "Understanding constructive vector addition and maximizing resultant magnitude",
      realWorldExample:
        "Multiple rocket engines pointing in the same direction combine their thrust to launch a spacecraft.",
    },
    {
      id: 4,
      description: "Create a resultant pointing northwest (315°)",
      objective: "Manipulate vectors to create a specific resultant direction",
      checkCompletion: (resultant) => Math.abs(resultant.angle - 315) < 10,
      feedback: "Excellent directional control! Your resultant is pointing northwest.",
      explanation:
        "You've balanced the x and y components to achieve a specific angle. For northwest (315°), you need negative y-components and negative x-components.",
      hint: "Try to make the sum of x-components negative and the sum of y-components positive with similar magnitudes.",
      completed: false,
      difficulty: "hard",
      learningOutcome: "Mastering precise directional control of resultant vectors",
      realWorldExample:
        "Aircraft navigation systems calculate required headings to reach destinations while accounting for crosswinds.",
    },
  ])

  // Toggle angle reference
  const toggleAngleReference = (vectorId: number) => {
    setVectors((prev) =>
      prev.map((v) => (v.id === vectorId ? { ...v, angleReference: v.angleReference === "x" ? "y" : "x" } : v)),
    )
  }

  // Handle accordion state
  const toggleAccordion = (value: string) => {
    setExpandedAccordions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  // Reset vectors to center if they go off-screen
  const resetVectors = () => {
    setVectors([
      {
        id: 1,
        startX: centerX,
        startY: centerY,
        endX: centerX + 192,
        endY: centerY - 166,
        color: vectorColors[0],
        angleReference: "x",
        angleLabelDistance: 2.0,
      },
      {
        id: 2,
        startX: centerX,
        startY: centerY,
        endX: centerX - 175,
        endY: centerY - 102,
        color: vectorColors[1],
        angleReference: "y",
        angleLabelDistance: 2.2,
      },
      {
        id: 3,
        startX: centerX,
        startY: centerY,
        endX: centerX - 216,
        endY: centerY + 91,
        color: vectorColors[2],
        angleReference: "x",
        angleLabelDistance: 1.8,
      },
      {
        id: 4,
        startX: centerX,
        startY: centerY,
        endX: centerX + 165,
        endY: centerY + 130,
        color: vectorColors[3],
        angleReference: "y",
        angleLabelDistance: 2.5,
      },
    ])

    // Reset any custom angle label positions
    setVectors((prev) => prev.map((v) => ({ ...v, angleLabelPosition: undefined })))

    toast({
      title: "Vectors Reset",
      description: "All vectors have been reset to their initial positions.",
    })

    // Reset prediction state when vectors are reset
    setPredictionSubmitted(false)
    setDirectionPrediction(null)
    setMagnitudePrediction(null)
    setPredictionAccuracy(null)
    setShowPredictionTips(false)
  }

  // Update challenge progress based on how close the user is to completing it
  const updateChallengeProgress = () => {
    if (activeChallenge !== null) {
      const challenge = challenges.find((c) => c.id === activeChallenge)
      if (challenge) {
        let progress = 0

        // Calculate progress based on challenge type
        switch (activeChallenge) {
          case 1: // Zero resultant
            progress = Math.max(0, Math.min(100, 100 - (resultantVector.magnitude / 50) * 100))
            break
          case 2: // East direction
            const eastAngleError = Math.min(Math.abs(resultantVector.angle), Math.abs(resultantVector.angle - 360))
            progress = Math.max(0, Math.min(100, 100 - (eastAngleError / 45) * 100))
            break
          case 3: // Magnitude > 150
            progress = Math.max(0, Math.min(100, (resultantVector.magnitude / 150) * 100))
            break
          case 4: // Northwest direction
            const nwAngleError = Math.abs(resultantVector.angle - 315)
            progress = Math.max(0, Math.min(100, 100 - (nwAngleError / 45) * 100))
            break
          default:
            progress = 0
        }

        setChallengeProgress((prev) => ({
          ...prev,
          [activeChallenge]: Math.round(progress),
        }))
      }
    }
  }

  // Check if active challenge is completed
  const checkChallengeCompletion = () => {
    if (activeChallenge !== null) {
      const challenge = challenges.find((c) => c.id === activeChallenge)
      if (challenge && !challenge.completed && challenge.checkCompletion(resultantVector)) {
        // Calculate completion time
        const completionTime = challengeStartTime ? Math.round((Date.now() - challengeStartTime) / 1000) : null

        // Update challenge state
        setChallenges((prev) => prev.map((c) => (c.id === activeChallenge ? { ...c, completed: true } : c)))
        setShowChallengeSuccess(true)
        setShowChallengeExplanation(true)
        setCompletedChallengesCount((prev) => prev + 1)

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }

        // Show success message with completion time
        toast({
          title: "Challenge Completed!",
          description: completionTime
            ? `You solved it in ${completionTime} seconds!`
            : "Great job solving the challenge!",
          variant: "default",
        })

        setTimeout(() => {
          setShowChallengeSuccess(false)
        }, 8000)
      }
    }
  }

  const [draggingAngleLabel, setDraggingAngleLabel] = useState<{
    vectorId: number
    initialX: number
    initialY: number
  } | null>(null)

  // Handle mouse down on a point or angle label
  const handleMouseDown = (vectorId: number, isEnd: boolean, isAngleLabel?: boolean) => {
    setIsDragging(true)
    setDraggedPoint({ vectorId, isEnd, isAngleLabel })
    setActiveVectorId(vectorId)
    vectorsMovedRef.current = true
  }

  // Handle mouse down on an angle label for free movement
  const handleAngleLabelMouseDown = (e: React.MouseEvent, vectorId: number) => {
    e.stopPropagation()
    setDraggingAngleLabel({
      vectorId,
      initialX: e.clientX,
      initialY: e.clientY,
    })
    setActiveVectorId(vectorId)
  }

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && draggedPoint) {
      const svgRect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top

      setVectors((prevVectors) => {
        return prevVectors.map((vector) => {
          if (vector.id === draggedPoint.vectorId) {
            if (draggedPoint.isAngleLabel) {
              // Calculate the distance from the start point to the mouse position
              const dx = mouseX - vector.startX
              const dy = mouseY - vector.startY
              const distance = Math.sqrt(dx * dx + dy * dy)

              // Calculate the angle of the mouse position relative to the start point
              const angle = Math.atan2(dy, dx)

              // Calculate the normalized distance (as a multiplier)
              const normalizedDistance = distance / 20

              // Update the angle label distance
              return { ...vector, angleLabelDistance: Math.max(0.5, Math.min(3.0, normalizedDistance)) }
            } else if (draggedPoint.isEnd) {
              return { ...vector, endX: mouseX, endY: mouseY }
            } else {
              // When dragging the start point, maintain the vector's direction and length
              const dx = vector.endX - vector.startX
              const dy = vector.endY - vector.startY
              return { ...vector, startX: mouseX, startY: mouseY, endX: mouseX + dx, endY: mouseY + dy }
            }
          }
          return vector
        })
      })

      // Update challenge progress and check completion
      updateChallengeProgress()
      checkChallengeCompletion()
    } else if (draggingAngleLabel) {
      // Handle free movement of angle labels
      const svgRect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top

      setVectors((prevVectors) => {
        return prevVectors.map((vector) => {
          if (vector.id === draggingAngleLabel.vectorId) {
            // Set or update the custom position for the angle label
            return {
              ...vector,
              angleLabelPosition: {
                x: mouseX,
                y: mouseY,
              },
            }
          }
          return vector
        })
      })
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedPoint(null)
    setDraggingAngleLabel(null)
    // Keep active vector ID for a short time to allow for smoother transitions
    setTimeout(() => {
      setActiveVectorId(null)
    }, 500)
  }

  // Calculate prediction accuracy
  const calculatePredictionAccuracy = () => {
    if (
      !directionPrediction ||
      !magnitudePrediction ||
      directionPrediction === "Not sure" ||
      magnitudePrediction === "Not sure"
    ) {
      return "medium"
    }

    // Check direction accuracy
    const angle = resultantVector.angle
    let actualQuadrant: DirectionQuadrant = "Not sure"
    if (angle >= 0 && angle < 90) actualQuadrant = "NE"
    else if (angle >= 90 && angle < 180) actualQuadrant = "SE"
    else if (angle >= 180 && angle < 270) actualQuadrant = "SW"
    else actualQuadrant = "NW"

    const directionCorrect = directionPrediction === actualQuadrant

    // Check magnitude accuracy
    const magnitude = resultantVector.magnitude
    let actualRange: MagnitudeRange = "Not sure"
    if (magnitude < 50) actualRange = "< 50 N"
    else if (magnitude >= 50 && magnitude < 100) actualRange = "50-100 N"
    else if (magnitude >= 100 && magnitude < 150) actualRange = "100-150 N"
    else actualRange = "> 150 N"

    const magnitudeCorrect = magnitudePrediction === actualRange

    // Determine overall accuracy
    if (directionCorrect && magnitudeCorrect) return "high"
    if (directionCorrect || magnitudeCorrect) return "medium"
    return "low"
  }

  // Handle prediction submission
  const handlePredictionSubmit = () => {
    if (directionPrediction && magnitudePrediction) {
      setPredictionSubmitted(true)
      const accuracy = calculatePredictionAccuracy()
      setPredictionAccuracy(accuracy as "high" | "medium" | "low")

      // Show tips for low accuracy predictions
      if (accuracy === "low") {
        setShowPredictionTips(true)
      }

      // Show toast notification based on accuracy
      if (accuracy === "high") {
        toast({
          title: "Excellent Prediction!",
          description: "Your prediction was very accurate.",
          variant: "default",
        })
      } else if (accuracy === "low") {
        toast({
          title: "Keep Practicing",
          description: "Try analyzing the vector components more carefully.",
          variant: "default",
        })
      }
    }
  }

  // Get feedback for direction prediction
  const getDirectionFeedback = () => {
    if (!directionPrediction || directionPrediction === "Not sure") return ""

    const angle = resultantVector.angle
    let actualQuadrant: DirectionQuadrant = "Not sure"

    if (angle >= 0 && angle < 90) actualQuadrant = "NE"
    else if (angle >= 90 && angle < 180) actualQuadrant = "SE"
    else if (angle >= 180 && angle < 270) actualQuadrant = "SW"
    else actualQuadrant = "NW"

    if (directionPrediction === actualQuadrant) {
      return `Good prediction! The actual direction is ${Math.round(angle)}°, which is in the ${actualQuadrant} quadrant.`
    } else {
      return `The actual direction is ${Math.round(angle)}°, which is in the ${actualQuadrant} quadrant.`
    }
  }

  // Get feedback for magnitude prediction
  const getMagnitudeFeedback = () => {
    if (!magnitudePrediction || magnitudePrediction === "Not sure") return ""

    const magnitude = resultantVector.magnitude
    let actualRange: MagnitudeRange = "Not sure"

    if (magnitude < 50) actualRange = "< 50 N"
    else if (magnitude >= 50 && magnitude < 100) actualRange = "50-100 N"
    else if (magnitude >= 100 && magnitude < 150) actualRange = "100-150 N"
    else actualRange = "> 150 N"

    if (magnitudePrediction === actualRange) {
      return `Good estimation! The actual magnitude is ${Math.round(magnitude)} N, which is ${actualRange}.`
    } else {
      return `The actual magnitude is ${Math.round(magnitude)} N, which is ${actualRange}.`
    }
  }

  // Reset prediction
  const resetPrediction = () => {
    setPredictionSubmitted(false)
    setDirectionPrediction(null)
    setMagnitudePrediction(null)
    setPredictionAccuracy(null)
    setShowPredictionTips(false)
  }

  // Start a challenge
  const startChallenge = (challengeId: number) => {
    setActiveChallenge(challengeId)
    resetPrediction()
    setShowPrediction(false)
    setShowHint(false)
    setShowChallengeIntro(true)
    setShowRealWorldExample(false)

    // Reset vectors when starting a new challenge
    resetVectors()

    // Initialize progress for this challenge
    setChallengeProgress((prev) => ({
      ...prev,
      [challengeId]: 0,
    }))

    // Start timer
    setChallengeStartTime(Date.now())
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setChallengeTimer(0)
    timerRef.current = setInterval(() => {
      setChallengeTimer((prev) => (prev !== null ? prev + 1 : 0))
    }, 1000)

    // Show toast with challenge objective
    const challenge = challenges.find((c) => c.id === challengeId)
    if (challenge) {
      toast({
        title: `Challenge: ${challenge.description}`,
        description: challenge.objective,
        variant: "default",
      })
    }
  }

  // Reset challenge
  const resetChallenge = () => {
    setActiveChallenge(null)
    setShowPrediction(!isMobile)
    setShowHint(false)
    setShowChallengeIntro(false)
    setShowChallengeExplanation(false)
    setShowRealWorldExample(false)

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setChallengeTimer(null)
    setChallengeStartTime(null)
  }

  // Format timer display
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "00:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Update mobile state on resize
  useEffect(() => {
    if (isMobile) {
      setShowPrediction(false)
      setExpandedAccordions([])
    }
  }, [isMobile])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Show a notification about draggable angle labels on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      toast({
        title: "Tip: Drag Angle Labels",
        description: "You can freely drag angle labels anywhere on the canvas for better visibility.",
        duration: 5000,
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // Add this function before the return statement
  const formatComponentValue = (value: number): string => {
    // Always return rounded integer values
    return Math.round(value).toString()
  }

  // Function to determine the proper rendering order of vectors
  const getVectorRenderOrder = () => {
    // If there's an active vector, move it to the end so it renders on top
    if (activeVectorId) {
      // Create a copy of vectors and sort them
      return [...vectors].sort((a, b) => {
        if (a.id === activeVectorId) return 1 // Move active vector to the end
        if (b.id === activeVectorId) return -1 // Move active vector to the end
        return 0 // Keep original order for other vectors
      })
    }
    return vectors
  }

  // Get ordered vectors for rendering
  const orderedVectors = getVectorRenderOrder()

  // Function to verify trigonometric calculations
  const verifyTrigCalculations = () => {
    // Test each vector's component calculations
    const verificationResults = vectors.map((vector) => {
      const dx = vector.endX - vector.startX
      const dy = vector.startY - vector.endY
      const magnitude = Math.sqrt(dx * dx + dy * dy)

      // Get the component data for this vector
      const component = vectorComponents.find((c) => c.id === vector.id)

      if (!component) return null

      // Extract the angle from reference
      const angleFromRef = component.angleFromRef
      const angleRadians = (angleFromRef * Math.PI) / 180

      // Calculate expected components based on reference axis
      let expectedX = 0
      let expectedY = 0

      if (vector.angleReference === "x") {
        // From x-axis
        if (dx >= 0) {
          expectedX = magnitude * Math.cos(angleRadians)
        } else {
          expectedX = -magnitude * Math.cos(angleRadians)
        }

        if (dy >= 0) {
          expectedY = magnitude * Math.sin(angleRadians)
        } else {
          expectedY = -magnitude * Math.sin(angleRadians)
        }
      } else {
        // From y-axis
        if (dx >= 0) {
          expectedX = magnitude * Math.sin(angleRadians)
        } else {
          expectedX = -magnitude * Math.sin(angleRadians)
        }

        if (dy >= 0) {
          expectedY = magnitude * Math.cos(angleRadians)
        } else {
          expectedY = -magnitude * Math.cos(angleRadians)
        }
      }

      // Compare with actual values
      const errorX = Math.abs(expectedX - dx)
      const errorY = Math.abs(expectedY - dy)

      return {
        vectorId: vector.id,
        quadrant: component.quadrant,
        angleFromRef: Math.round(angleFromRef),
        reference: vector.angleReference,
        actualX: Math.round(dx),
        actualY: Math.round(dy),
        expectedX: Math.round(expectedX),
        expectedY: Math.round(expectedY),
        errorX: Math.round(errorX),
        errorY: Math.round(errorY),
        isAccurate: errorX < 1 && errorY < 1,
      }
    })

    console.table(verificationResults)
    return verificationResults
  }

  // Run verification on component mount
  useEffect(() => {
    verifyTrigCalculations()
  }, [vectors])

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl">
      {/* Vector visualization area - expanded to take more horizontal space */}
      <Card className="p-3 flex-1 shadow-md" ref={canvasRef}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <MousePointer className="w-4 h-4 mr-1 text-red-500" />
            <span className="text-sm font-medium">Drag red dots to change direction & magnitude</span>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-1 bg-gray-50 border-gray-300 hover:bg-gray-100"
                  >
                    <Move className="w-3 h-3 text-gray-700" />
                    <span className="hidden sm:inline text-gray-700 font-medium">Drag Angle Labels</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-white p-2 border-gray-300 shadow-md">
                  <p className="text-xs">Drag the labels to reposition them for better visibility</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={resetVectors} className="h-8 bg-transparent">
              <Maximize2 className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
        <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200">
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="bg-white vector-canvas"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              {/* Define filters for highlighting active vectors */}
              <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Display area border */}
            <rect
              x="1"
              y="1"
              width={canvasWidth - 2}
              height={canvasHeight - 2}
              fill="none"
              stroke="#cccccc"
              strokeWidth="2"
              strokeDasharray="8,4"
              rx="4"
              ry="4"
            />
            {/* Coordinate system - improved */}
            <g>
              {/* x-axis (horizontal) */}
              <line
                x1={centerX - 250}
                y1={centerY}
                x2={centerX + 250}
                y2={centerY}
                stroke="gray"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <polygon
                points={`${centerX + 250},${centerY} ${centerX + 245},${centerY - 3} ${centerX + 245},${centerY + 3}`}
                fill="gray"
              />
              <text x={centerX + 255} y={centerY + 5} fontSize="12" fill="gray" fontFamily="var(--font-mono)">
                x
              </text>

              {/* y-axis (vertical) */}
              <line
                x1={centerX}
                y1={centerY + 150}
                x2={centerX}
                y2={centerY - 150}
                stroke="gray"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <polygon
                points={`${centerX},${centerY - 150} ${centerX - 3},${centerY - 145} ${centerX + 3},${centerY - 145}`}
                fill="gray"
              />
              <text x={centerX + 5} y={centerY - 155} fontSize="12" fill="gray" fontFamily="var(--font-mono)">
                y
              </text>

              {/* Coordinate system legend */}
              <g transform={`translate(${canvasWidth - 100}, ${canvasHeight - 80})`}>
                <line x1={0} y1={30} x2={50} y2={30} stroke="black" strokeWidth={1} />
                <polygon points="50,30 45,27 45,33" fill="black" />
                <text x={55} y={34} fontSize="12" fill="black" fontFamily="var(--font-mono)">
                  x
                </text>

                <line x1={0} y1={30} x2={0} y2={0} stroke="black" strokeWidth={1} />
                <polygon points="0,0 -3,5 3,5" fill="black" />
                <text x={5} y={10} fontSize="12" fill="black" fontFamily="var(--font-mono)">
                  y
                </text>
              </g>

              {/* Cardinal directions legend */}
              <g transform={`translate(${centerX}, ${centerY - 180})`}>
                <text x={0} y={-10} fontSize="12" fill="black" textAnchor="middle">
                  North
                </text>
                <text x={120} y={0} fontSize="12" fill="black" textAnchor="middle">
                  East
                </text>
                <text x={0} y={10} fontSize="12" fill="black" textAnchor="middle">
                  South
                </text>
                <text x={-120} y={0} fontSize="12" fill="black" textAnchor="middle">
                  West
                </text>
              </g>
            </g>

            {/* Resultant vector */}
            {resultantVector && showResultant && (
              <g>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={centerX + resultantVector.x}
                  y2={centerY - resultantVector.y}
                  stroke="red"
                  strokeWidth={3}
                />
                <ArrowHead
                  x={centerX + resultantVector.x}
                  y={centerY - resultantVector.y}
                  angle={Math.atan2(-resultantVector.y, resultantVector.x)}
                  color="red"
                />

                {/* Resultant magnitude label with background */}
                <g>
                  <rect
                    x={centerX + resultantVector.x / 2 - 35}
                    y={centerY - resultantVector.y / 2 - 22}
                    width="70"
                    height="24"
                    rx="6"
                    fill="white"
                    fillOpacity="0.98"
                    stroke="red"
                    strokeWidth="1.5"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))"
                  />
                  <text
                    x={centerX + resultantVector.x / 2}
                    y={centerY - resultantVector.y / 2 - 10}
                    fontSize="14"
                    fill="red"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                  >
                    {Math.round(resultantVector.magnitude)} N
                  </text>
                </g>
              </g>
            )}

            {/* Challenge target visualization */}
            {activeChallenge && (
              <g>
                {activeChallenge === 1 && (
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={20}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                )}
                {activeChallenge === 2 && (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={centerX + 100}
                    y2={centerY}
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                )}
                {activeChallenge === 3 && (
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={150}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                )}
                {activeChallenge === 4 && (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={centerX - 70.7}
                    y2={centerY - 70.7}
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                )}
              </g>
            )}

            {/* Vectors - use ordered vectors to control rendering order */}
            {orderedVectors.map((vector) => {
              const dx = vector.endX - vector.startX
              const dy = vector.endY - vector.startY
              const magnitude = Math.sqrt(dx * dx + dy * dy)
              const angle = Math.atan2(-dy, dx) * (180 / Math.PI)
              const normalizedAngle = (angle < 0 ? angle + 360 : angle) % 360

              // Get the component data for this vector
              const component = vectorComponents.find((c) => c.id === vector.id)
              const angleFromRef = component ? component.angleFromRef : 0

              // Calculate position for the magnitude label
              const midX = (vector.startX + vector.endX) / 2
              const midY = (vector.startY + vector.endY) / 2
              const labelOffsetX = (dx / magnitude) * 15
              const labelOffsetY = (dy / magnitude) * 15

              // Calculate position for the angle label with adjustable distance
              const angleLabelDistance = vector.angleLabelDistance || 1.0
              const angleLabelX = vector.startX + 20 * Math.cos((normalizedAngle * Math.PI) / 180) * angleLabelDistance
              const angleLabelY = vector.startY - 20 * Math.sin((normalizedAngle * Math.PI) / 180) * angleLabelDistance

              const isHovered = hoveredVector === vector.id
              const isActive = activeVectorId === vector.id

              // Determine direction indicators
              const xDirection = dx >= 0 ? "→" : "←"
              const yDirection = dy <= 0 ? "↑" : "↓"

              // Check if vector is active (being dragged)
              const isVectorActive = vector.id === activeVectorId

              return (
                <g
                  key={vector.id}
                  onMouseEnter={() => !isDragging && setHoveredVector(vector.id)}
                  onMouseLeave={() => !isDragging && setHoveredVector(null)}
                  className={isVectorActive ? "vector-active" : ""}
                >
                  {/* Vector line */}
                  <line
                    x1={vector.startX}
                    y1={vector.startY}
                    x2={vector.endX}
                    y2={vector.endY}
                    stroke={vector.color}
                    strokeWidth={isHovered || isActive ? 3 : 2}
                    filter={isActive ? "url(#active-glow)" : "none"}
                  />

                  {/* X component with arrowhead */}
                  <line
                    x1={vector.startX}
                    y1={vector.startY}
                    x2={vector.endX}
                    y2={vector.startY}
                    stroke={highlightedComponent === "x" || isHovered ? vector.color : "#0000ff33"}
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={highlightedComponent === "x" || isHovered ? 0.8 : 0.3}
                  />
                  {(highlightedComponent === "x" || isHovered) && (
                    <polygon
                      points={`${vector.endX},${vector.startY} ${vector.endX - 5},${vector.startY - 3} ${vector.endX - 5},${vector.startY + 3}`}
                      fill={vector.color}
                      opacity={0.8}
                      transform={`rotate(${dx < 0 ? 180 : 0}, ${vector.endX}, ${vector.startY})`}
                    />
                  )}

                  {/* Y component with arrowhead */}
                  <line
                    x1={vector.endX}
                    y1={vector.startY}
                    x2={vector.endX}
                    y2={vector.endY}
                    stroke={highlightedComponent === "y" || isHovered ? vector.color : "#0000ff33"}
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={highlightedComponent === "y" || isHovered ? 0.8 : 0.3}
                  />
                  {(highlightedComponent === "y" || isHovered) && (
                    <polygon
                      points={`${vector.endX},${vector.endY} ${vector.endX - 3},${vector.endY + 5} ${vector.endX + 3},${vector.endY + 5}`}
                      fill={vector.color}
                      opacity={0.8}
                      transform={`rotate(${dy < 0 ? 180 : 0}, ${vector.endX}, ${vector.endY})`}
                    />
                  )}

                  {/* Arrow head */}
                  <ArrowHead x={vector.endX} y={vector.endY} angle={Math.atan2(dy, dx)} color={vector.color} />

                  {/* Combined vector label with magnitude and angle */}
                  <g className={isActive ? "vector-details-active" : ""}>
                    {(() => {
                      // Use the angle label position for the combined label
                      const angleLabelDistance = vector.angleLabelDistance || 1.5
                      const defaultX =
                        vector.startX + 30 * Math.cos((normalizedAngle * Math.PI) / 180) * angleLabelDistance
                      const defaultY =
                        vector.startY - 30 * Math.sin((normalizedAngle * Math.PI) / 180) * angleLabelDistance

                      // Use custom position if available, otherwise use default
                      const labelX = vector.angleLabelPosition?.x || defaultX
                      const labelY = vector.angleLabelPosition?.y || defaultY

                      // Calculate width based on content
                      const width = vector.angleReference === "x" ? 80 : 90

                      return (
                        <>
                          {/* Combined label background */}
                          <rect
                            x={labelX - width / 2}
                            y={labelY - 20}
                            width={width}
                            height="40"
                            rx="6"
                            fill="white"
                            fillOpacity="0.98"
                            stroke={vector.color}
                            strokeWidth={isActive ? 2 : 1.5}
                            opacity={isHovered ? 1 : 0.9}
                            cursor="move"
                            filter={
                              isActive
                                ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))"
                                : "drop-shadow(0px 1px 2px rgba(0,0,0,0.05))"
                            }
                            onMouseDown={(e) => handleAngleLabelMouseDown(e, vector.id)}
                          />

                          {/* First line: Vector ID and magnitude */}
                          <text
                            x={labelX}
                            y={labelY - 8}
                            fontSize="12"
                            fill={vector.color}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontWeight="bold"
                            cursor="move"
                            fontFamily="var(--font-mono)"
                            onMouseDown={(e) => handleAngleLabelMouseDown(e, vector.id)}
                          >
                            F{vector.id}: {Math.round(magnitude)} N
                          </text>

                          {/* Second line: Angle */}
                          <text
                            x={labelX}
                            y={labelY + 8}
                            fontSize="12"
                            fill={vector.color}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontWeight="bold"
                            cursor="move"
                            onMouseDown={(e) => handleAngleLabelMouseDown(e, vector.id)}
                          >
                            {Math.round(angleFromRef)}° {vector.angleReference === "x" ? "from x" : "from y"}
                          </text>

                          {/* Toggle reference button */}
                          <circle
                            cx={labelX + width / 2 - 10}
                            cy={labelY - 20}
                            r={4}
                            fill={vector.color}
                            opacity={0.7}
                            onClick={() => toggleAngleReference(vector.id)}
                            cursor="pointer"
                          />
                          <text
                            x={labelX + width / 2 - 10}
                            y={labelY - 20}
                            fontSize="8"
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontWeight="bold"
                            pointerEvents="none"
                          >
                            {vector.angleReference}
                          </text>
                        </>
                      )
                    })()}
                  </g>

                  {/* Component formulas when hovered */}
                  {(isHovered || isActive) && showComponentFormulas && (
                    <g className={isActive ? "vector-details-active" : ""}>
                      {/* X component formula */}
                      <rect
                        x={vector.endX + 10}
                        y={vector.startY - 20}
                        width="220"
                        height="40"
                        rx="8"
                        fill="white"
                        stroke={vector.color}
                        strokeWidth={isActive ? 2.5 : 2}
                        fillOpacity="0.98"
                        filter={
                          isActive
                            ? "drop-shadow(0px 3px 6px rgba(0,0,0,0.15))"
                            : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
                        }
                      />
                      <text
                        x={vector.endX + 20}
                        y={vector.startY}
                        fontSize="12"
                        fill={vector.color}
                        dominantBaseline="middle"
                        fontFamily="var(--font-mono)"
                        fontWeight="bold"
                      >
                        <tspan x={vector.endX + 20} dy="0">
                          {component?.xComponentFormula || ""}
                        </tspan>
                      </text>

                      {/* Y component formula */}
                      <rect
                        x={vector.endX + 10}
                        y={vector.endY + 10}
                        width="220"
                        height="40"
                        rx="8"
                        fill="white"
                        stroke={vector.color}
                        strokeWidth={isActive ? 2.5 : 2}
                        fillOpacity="0.98"
                        filter={
                          isActive
                            ? "drop-shadow(0px 3px 6px rgba(0,0,0,0.15))"
                            : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
                        }
                      />
                      <text
                        x={vector.endX + 20}
                        y={vector.endY + 30}
                        fontSize="12"
                        fill={vector.color}
                        dominantBaseline="middle"
                        fontFamily="var(--font-mono)"
                        fontWeight="bold"
                      >
                        <tspan x={vector.endX + 20} dy="0">
                          {component?.yComponentFormula || ""}
                        </tspan>
                      </text>
                    </g>
                  )}

                  {/* Tooltip for vector contribution */}
                  {(isHovered || isActive) && !showComponentFormulas && (
                    <g className={isActive ? "vector-details-active" : ""}>
                      <rect
                        x={vector.endX + 10}
                        y={vector.endY - 30}
                        width="240"
                        height="80"
                        rx="8"
                        fill="white"
                        stroke={vector.color}
                        strokeWidth={isActive ? 2.5 : 2}
                        fillOpacity="0.98"
                        filter={
                          isActive
                            ? "drop-shadow(0px 3px 6px rgba(0,0,0,0.15))"
                            : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
                        }
                      />
                      <text
                        x={vector.endX + 20}
                        y={vector.endY - 10}
                        fontSize="12"
                        fill={vector.color}
                        fontFamily="var(--font-mono)"
                        fontWeight="bold"
                      >
                        <tspan x={vector.endX + 20} dy="0">
                          Components of F{vector.id},
                        </tspan>
                        <tspan x={vector.endX + 20} dy="22" fontWeight="normal" fill={vector.color}>
                          {component?.xComponentFormula || ""}
                        </tspan>
                        <tspan x={vector.endX + 20} dy="22" fontWeight="normal" fill={vector.color}>
                          {component?.yComponentFormula || ""}
                        </tspan>
                      </text>
                      <line
                        x1={vector.endX + 10}
                        x2={vector.endX + 250}
                        y1={vector.endY - 12}
                        y2={vector.endY - 12}
                        stroke={vector.color}
                        strokeWidth="1"
                        strokeOpacity="0.5"
                      />
                    </g>
                  )}

                  {/* Draggable points */}
                  <circle
                    cx={vector.endX}
                    cy={vector.endY}
                    r={isHovered || isActive ? 6 : 5}
                    fill="red"
                    stroke="white"
                    strokeWidth={1.5}
                    cursor="pointer"
                    filter={isActive ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))" : "none"}
                    onMouseDown={() => handleMouseDown(vector.id, true)}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Component formula toggle */}
        <div className="flex justify-between mt-2">
          {/* Replace this button:
<Button variant="outline" size="sm" onClick={() => setShowResultant(!showResultant)} className="text-xs h-7">
  {showResultant ? "Hide Resultant" : "Show Resultant"}
</Button>
*/}

          {/* With this checkbox: */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-resultant"
              checked={showResultant}
              onChange={() => setShowResultant(!showResultant)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="show-resultant" className="text-xs text-gray-700">
              Show resultant force arrow
            </label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComponentFormulas(!showComponentFormulas)}
            className="text-xs h-7"
          >
            {showComponentFormulas ? "Hide Formulas" : "Show Component Formulas"}
          </Button>
        </div>

        <div className="mt-2 bg-yellow-50 p-2 rounded-md border border-yellow-200 text-xs">
          <div className="flex items-center">
            <HelpCircle className="w-3 h-3 mr-1 text-yellow-500" />
            <span className="text-yellow-800 font-medium">Reminder:</span>
          </div>
          <p className="text-yellow-800">Set your calculator to degree mode for this module.</p>
        </div>

        <div className="mt-2 bg-blue-50 p-2 rounded-md border border-blue-200 text-xs">
          <div className="flex items-center">
            <Compass className="w-3 h-3 mr-1 text-blue-500" />
            <span className="text-blue-800 font-medium">Sign Convention:</span>
          </div>
          <p className="text-blue-800">
            Upward is positive (+Fy), downward is negative (-Fy). Right-hand side is positive (+Fx), left-hand side is
            negative (-Fx).
          </p>
        </div>
        <div className="mt-2 bg-purple-50 p-2 rounded-md border border-purple-200 text-xs">
          <div className="flex items-center">
            <Info className="w-3 h-3 mr-1 text-purple-500" />
            <span className="text-purple-800 font-medium">Changing Angle Reference:</span>
          </div>
          <p className="text-purple-800">
            To change angle reference between x-axis and y-axis, click on the small colored circle with "x" or "y" in
            the top corner of each vector's label box.
          </p>
        </div>
      </Card>

      {/* Results panel - now more compact with accordions */}
      <div className="w-full lg:w-80">
        <div className="space-y-3">
          {/* Challenge section - Improved UI */}
          <Accordion
            type="multiple"
            value={expandedAccordions}
            onValueChange={setExpandedAccordions}
            className="bg-white rounded-md shadow-md border border-gray-100"
          >
            <AccordionItem value="challenges" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center text-amber-700">
                  <Target className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Challenges</span>
                  {completedChallengesCount > 0 && (
                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                      {completedChallengesCount}/{challenges.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Challenge intro modal */}
                {showChallengeIntro && activeChallenge && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4 relative">
                    <div className="flex items-center mb-2">
                      <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                      <h3 className="font-medium text-blue-700">Challenge Objective</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      {challenges.find((c) => c.id === activeChallenge)?.objective}
                    </p>
                    <div className="flex items-center mb-2">
                      <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                      <h3 className="font-medium text-blue-700">Learning Outcome</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      {challenges.find((c) => c.id === activeChallenge)?.learningOutcome}
                    </p>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => setShowChallengeIntro(false)}>
                        Start Challenge
                      </Button>
                    </div>
                  </div>
                )}

                {/* Challenge success message */}
                {showChallengeSuccess && activeChallenge && (
                  <div className="bg-green-100 text-green-800 p-3 rounded-md mb-3 flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{challenges.find((c) => c.id === activeChallenge)?.feedback}</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-green-700"
                        onClick={() => setShowRealWorldExample(!showRealWorldExample)}
                      >
                        {showRealWorldExample ? "Hide real-world example" : "See real-world example"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Real-world example */}
                {showRealWorldExample && activeChallenge && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                    <div className="flex items-center mb-1">
                      <Globe className="w-4 h-4 mr-2 text-amber-600" />
                      <h3 className="font-medium text-amber-700">Real-World Application</h3>
                    </div>
                    <p className="text-sm text-amber-700">
                      {challenges.find((c) => c.id === activeChallenge)?.realWorldExample}
                    </p>
                  </div>
                )}

                {/* Challenge explanation */}
                {showChallengeExplanation && activeChallenge && (
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-md mb-3 mt-2 text-sm">
                    <div className="flex items-center mb-1">
                      <Info className="w-4 h-4 mr-2 text-blue-600" />
                      <p className="font-medium">Why this works:</p>
                    </div>
                    <p>{challenges.find((c) => c.id === activeChallenge)?.explanation}</p>
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowChallengeExplanation(false)}>
                        Got it
                      </Button>
                    </div>
                  </div>
                )}

                {!activeChallenge ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Trophy className="w-4 h-4 mr-2 text-amber-600" />
                        <span className="font-medium text-amber-700">Complete challenges to learn</span>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {completedChallengesCount}/{challenges.length} done
                      </Badge>
                    </div>

                    {challenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className={`p-3 rounded-md border transition-all ${
                          challenge.completed
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-amber-100 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {challenge.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-amber-300 mr-2" />
                            )}
                            <span className={`font-medium ${challenge.completed ? "text-green-700" : "text-gray-800"}`}>
                              {challenge.description}
                            </span>
                          </div>
                          {challenge.difficulty === "easy" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Easy
                            </Badge>
                          )}
                          {challenge.difficulty === "medium" && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Medium
                            </Badge>
                          )}
                          {challenge.difficulty === "hard" && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Hard
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{challenge.objective}</p>
                        <div className="flex justify-end">
                          <Button
                            variant={challenge.completed ? "outline" : "default"}
                            size="sm"
                            onClick={() => startChallenge(challenge.id)}
                            className={`h-7 px-3 text-xs ${
                              challenge.completed ? "text-green-700 border-green-300" : ""
                            }`}
                          >
                            {challenge.completed ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 mr-1" /> Try Challenge
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-800">
                          {challenges.find((c) => c.id === activeChallenge)?.description}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {challenges.find((c) => c.id === activeChallenge)?.objective}
                        </p>
                      </div>
                      {challenges.find((c) => c.id === activeChallenge)?.difficulty === "easy" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Easy
                        </Badge>
                      )}
                      {challenges.find((c) => c.id === activeChallenge)?.difficulty === "medium" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Medium
                        </Badge>
                      )}
                      {challenges.find((c) => c.id === activeChallenge)?.difficulty === "hard" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Hard
                        </Badge>
                      )}
                    </div>

                    {/* Challenge timer */}
                    <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-600" />
                        <span className="text-sm text-gray-700">Time:</span>
                      </div>
                      <span className="font-mono text-sm font-medium">{formatTime(challengeTimer)}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs font-medium">{challengeProgress[activeChallenge] || 0}% complete</span>
                      </div>
                      <Progress value={challengeProgress[activeChallenge] || 0} className="h-2" />
                    </div>

                    {/* Hint section */}
                    <div className="mb-3">
                      {!showHint ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowHint(true)}
                          className="w-full text-xs h-8"
                        >
                          <Lightbulb className="w-3 h-3 mr-1" /> Need a hint?
                        </Button>
                      ) : (
                        <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                          <div className="flex items-center mb-1">
                            <Lightbulb className="w-4 h-4 mr-1 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">Hint:</span>
                          </div>
                          <p className="text-xs text-blue-700">
                            {challenges.find((c) => c.id === activeChallenge)?.hint}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetVectors()
                          updateChallengeProgress()
                        }}
                        className="flex items-center"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetChallenge}>
                        Exit Challenge
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Prediction section */}
            <AccordionItem value="prediction" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center text-blue-700">
                  <Brain className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Make a Prediction</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {!activeChallenge && (
                  <>
                    {!predictionSubmitted ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                          <div className="flex items-center mb-1">
                            <Compass className="w-4 h-4 mr-1 text-blue-600" />
                            <h3 className="text-sm font-medium text-blue-700">Direction Prediction</h3>
                          </div>
                          <p className="text-xs text-blue-600 mb-2">
                            Based on the vectors, which direction will the resultant point?
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {["NE", "SE", "SW", "NW", "Not sure"].map((direction) => (
                              <div
                                key={direction}
                                className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${
                                  directionPrediction === direction
                                    ? "bg-blue-100 border-blue-300"
                                    : "bg-white border-gray-200 hover:bg-blue-50"
                                }`}
                                onClick={() => setDirectionPrediction(direction as DirectionQuadrant)}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                                    directionPrediction === direction ? "bg-blue-500" : "bg-gray-200"
                                  }`}
                                >
                                  {directionPrediction === direction && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </div>
                                <span className="text-sm">{direction}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="flex items-center mb-1">
                            <Ruler className="w-4 h-4 mr-1 text-blue-600" />
                            <h3 className="text-sm font-medium text-blue-700">Magnitude Prediction</h3>
                          </div>
                          <p className="text-xs text-blue-600 mb-2">Estimate the strength of the resultant force:</p>
                          <div className="space-y-2">
                            {["< 50 N", "50-100 N", "100-150 N", "> 150 N", "Not sure"].map((range) => (
                              <div
                                key={range}
                                className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${
                                  magnitudePrediction === range
                                    ? "bg-blue-100 border-blue-300"
                                    : "bg-white border-gray-200 hover:bg-blue-50"
                                }`}
                                onClick={() => setMagnitudePrediction(range as MagnitudeRange)}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                                    magnitudePrediction === range ? "bg-blue-500" : "bg-gray-200"
                                  }`}
                                >
                                  {magnitudePrediction === range && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </div>
                                <span className="text-sm">{range}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={handlePredictionSubmit}
                          disabled={!directionPrediction || !magnitudePrediction}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Submit Prediction
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className={`p-4 rounded-md ${
                            predictionAccuracy === "high"
                              ? "bg-green-50 border border-green-200"
                              : predictionAccuracy === "medium"
                                ? "bg-amber-50 border border-amber-200"
                                : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            {predictionAccuracy === "high" && <ThumbsUp className="w-5 h-5 mr-2 text-green-600" />}
                            {predictionAccuracy === "medium" && <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />}
                            {predictionAccuracy === "low" && <AlertCircle className="w-5 h-5 mr-2 text-red-600" />}
                            <h3
                              className={`font-medium ${
                                predictionAccuracy === "high"
                                  ? "text-green-700"
                                  : predictionAccuracy === "medium"
                                    ? "text-amber-700"
                                    : "text-red-700"
                              }`}
                            >
                              {predictionAccuracy === "high"
                                ? "Excellent Prediction!"
                                : predictionAccuracy === "medium"
                                  ? "Good Attempt!"
                                  : "Keep Practicing!"}
                            </h3>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Your prediction:</span>
                              <Badge variant="outline" className="text-xs">
                                Score:{" "}
                                {predictionAccuracy === "high"
                                  ? "2/2"
                                  : predictionAccuracy === "medium"
                                    ? "1/2"
                                    : "0/2"}
                              </Badge>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">Direction:</span>
                              <Badge
                                variant={directionPrediction === "Not sure" ? "outline" : "default"}
                                className={`${
                                  getDirectionFeedback().includes("Good prediction")
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }`}
                              >
                                {directionPrediction}
                              </Badge>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm mr-2">Magnitude:</span>
                              <Badge
                                variant={magnitudePrediction === "Not sure" ? "outline" : "default"}
                                className={`${
                                  getMagnitudeFeedback().includes("Good estimation")
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }`}
                              >
                                {magnitudePrediction}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <p
                              className={`${
                                getDirectionFeedback().includes("Good prediction") ? "text-green-700" : "text-gray-700"
                              }`}
                            >
                              {getDirectionFeedback()}
                            </p>
                            <p
                              className={`${
                                getMagnitudeFeedback().includes("Good estimation") ? "text-green-700" : "text-gray-700"
                              }`}
                            >
                              {getMagnitudeFeedback()}
                            </p>
                          </div>
                        </div>

                        {showPredictionTips && (
                          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                            <div className="flex items-center mb-2">
                              <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
                              <h3 className="text-sm font-medium text-blue-700">Tips for Better Predictions</h3>
                            </div>
                            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
                              <li>Look at the x and y components of each vector</li>
                              <li>Consider which vectors are pointing in similar directions (they add up)</li>
                              <li>Vectors pointing in opposite directions tend to cancel each other</li>
                              <li>Longer vectors have more influence on the resultant</li>
                            </ul>
                          </div>
                        )}

                        {vectorsMovedRef.current && (
                          <Button
                            variant="outline"
                            onClick={resetPrediction}
                            className="w-full flex items-center justify-center bg-transparent"
                          >
                            <Compass className="w-4 h-4 mr-2" />
                            Make New Prediction
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Results analysis */}
            <AccordionItem value="analysis" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" defaultOpen={true}>
                <div className="flex items-center text-green-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Vector Analysis</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <Tabs defaultValue="vector-form" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 mb-2">
                    <TabsTrigger value="vector-form">Components</TabsTrigger>
                    <TabsTrigger value="magnitude-angle">Mag & Angle</TabsTrigger>
                  </TabsList>

                  <TabsContent value="vector-form" className="mt-0">
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-blue-600 text-sm">Vector Components:</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSteps(!showSteps)}
                          className="flex items-center h-7 px-2"
                        >
                          {showSteps ? (
                            <>
                              Hide <ChevronUp className="ml-1 h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show <ChevronDown className="ml-1 h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </div>

                      {showSteps ? (
                        <div className="space-y-3">
                          <div>
                            <div
                              className="font-medium text-blue-600 mb-1 cursor-pointer flex items-center text-sm"
                              onMouseEnter={() => setHighlightedComponent("x")}
                              onMouseLeave={() => setHighlightedComponent(null)}
                            >
                              Step 1: Sum of x-components (ΣFx) <ArrowRight className="h-3 w-3 ml-1" />
                            </div>
                            <div className="pl-3 text-xs space-y-1">
                              {vectorComponents.map((comp) => (
                                <div key={comp.id} className="flex items-center">
                                  {/* Replace the green and red dots in the x-components section with the actual vector colors */}
                                  <div
                                    className="w-2 h-2 rounded-full mr-1"
                                    style={{ backgroundColor: vectors.find((v) => v.id === comp.id)?.color }}
                                  ></div>
                                  <span style={{ color: vectors.find((v) => v.id === comp.id)?.color }}>
                                    F{comp.id}
                                  </span>
                                  : Fx = <span className="vector-value">{comp.xComponent}</span>
                                </div>
                              ))}
                              <div className="font-medium mt-1">
                                ΣFx ={" "}
                                <span className="vector-value">
                                  {Math.abs(resultantVector.x) < 0.1 ? "0" : Math.round(resultantVector.x)}
                                </span>{" "}
                                N
                              </div>
                            </div>
                          </div>

                          <div>
                            <div
                              className="font-medium text-blue-600 mb-1 cursor-pointer flex items-center text-sm"
                              onMouseEnter={() => setHighlightedComponent("y")}
                              onMouseLeave={() => setHighlightedComponent(null)}
                            >
                              Step 2: Sum of y-components (ΣFy) <ArrowUp className="h-3 w-3 ml-1" />
                            </div>
                            <div className="pl-3 text-xs space-y-1">
                              {vectorComponents.map((comp) => (
                                <div key={comp.id} className="flex items-center">
                                  {/* Similarly, replace the green and red dots in the y-components section */}
                                  <div
                                    className="w-2 h-2 rounded-full mr-1"
                                    style={{ backgroundColor: vectors.find((v) => v.id === comp.id)?.color }}
                                  ></div>
                                  <span style={{ color: vectors.find((v) => v.id === comp.id)?.color }}>
                                    F{comp.id}
                                  </span>
                                  : Fy = <span className="vector-value">{comp.yComponent}</span>
                                </div>
                              ))}
                              <div className="font-medium mt-1">
                                ΣFy ={" "}
                                <span className="vector-value">
                                  {Math.abs(resultantVector.y) < 0.1 ? "0" : Math.round(resultantVector.y)}
                                </span>{" "}
                                N
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailedCalculations(!showDetailedCalculations)}
                            className="w-full mt-2 text-xs"
                          >
                            {showDetailedCalculations ? "Hide Detailed Calculations" : "Show Detailed Calculations"}
                          </Button>

                          {showDetailedCalculations && (
                            <div className="mt-2 bg-white p-3 rounded border border-blue-100 text-xs">
                              <div className="font-medium mb-1">Detailed Calculation:</div>
                              <div className="space-y-1 font-mono">
                                <div>
                                  ΣFx ={" "}
                                  {vectorComponents.map((comp, idx) => (
                                    <span key={comp.id}>
                                      {comp.x >= 0 ? (idx === 0 ? "" : " + ") : " - "}
                                      {Math.abs(comp.x) < 0.1 ? "0" : Math.round(Math.abs(comp.x))} N
                                    </span>
                                  ))}
                                </div>
                                <div>
                                  = {Math.abs(resultantVector.x) < 0.1 ? "0" : Math.round(resultantVector.x)} N{" "}
                                  {resultantVector.x >= 0 ? "→" : "←"}
                                </div>

                                <div className="mt-2">
                                  ΣFy ={" "}
                                  {vectorComponents.map((comp, idx) => (
                                    <span key={comp.id}>
                                      {comp.y >= 0 ? (idx === 0 ? "" : " + ") : " - "}
                                      {Math.abs(comp.y) < 0.1 ? "0" : Math.round(Math.abs(comp.y))} N
                                    </span>
                                  ))}
                                </div>
                                <div>
                                  = {Math.abs(resultantVector.y) < 0.1 ? "0" : Math.round(resultantVector.y)} N{" "}
                                  {resultantVector.y >= 0 ? "↑" : "↓"}
                                </div>

                                <div className="mt-2">R = √[(ΣFx)² + (ΣFy)²]</div>
                                <div>
                                  = √[({Math.round(resultantVector.x)})² + ({Math.round(resultantVector.y)})²]
                                </div>
                                <div>= {Math.round(resultantVector.magnitude)} N</div>

                                <div className="mt-2">θ = tan⁻¹(ΣFy/ΣFx)</div>
                                <div>
                                  = tan⁻¹({Math.round(resultantVector.y)}/{Math.round(resultantVector.x)})
                                </div>
                                <div>= {Math.round(resultantVector.angle)}°</div>
                              </div>
                            </div>
                          )}

                          <div className="font-medium pt-2 border-t border-gray-200 text-sm">
                            Total: (ΣFx, ΣFy) = (
                            <span className="vector-value">
                              {Math.abs(resultantVector.x) < 0.1 ? "0" : Math.round(resultantVector.x)}
                            </span>
                            ,{" "}
                            <span className="vector-value">
                              {Math.abs(resultantVector.y) < 0.1 ? "0" : Math.round(resultantVector.y)}
                            </span>
                            )
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center mb-1">
                          <span className="text-lg font-mono">
                            (
                            <span className="vector-value">
                              {Math.abs(resultantVector.x) < 0.1 ? "0" : Math.round(resultantVector.x)}
                            </span>
                            ,{" "}
                            <span className="vector-value">
                              {Math.abs(resultantVector.y) < 0.1 ? "0" : Math.round(resultantVector.y)}
                            </span>
                            )
                          </span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="magnitude-angle" className="mt-0">
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-blue-600 mb-1 flex items-center text-sm">
                            Magnitude:
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0">
                                    <HelpCircle className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    The Pythagorean theorem is used to find the magnitude: √(Fx² + Fy²)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="text-sm font-mono">
                            Resultant = √((∑Fx)² + (∑Fy)²) = √(({Math.round(resultantVector.x)})² + (
                            {Math.round(resultantVector.y)})²) ={" "}
                            <span className="vector-value">{Math.round(resultantVector.magnitude)}</span> N
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-600 mb-1 flex items-center text-sm">
                            Angle:
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0">
                                    <HelpCircle className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    The arctangent (tan⁻¹) of Fy/Fx gives the angle relative to the positive x-axis.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="text-sm font-mono">
                            tanθ = (∑Fy)/(∑Fx) = ({Math.round(resultantVector.y)})/({Math.round(resultantVector.x)}) ={" "}
                            <span className="vector-value">
                              {(() => {
                                const angle = resultantVector.angle
                                let acuteAngle
                                if (angle >= 0 && angle <= 90) {
                                  acuteAngle = angle
                                } else if (angle > 90 && angle <= 180) {
                                  acuteAngle = 180 - angle
                                } else if (angle > 180 && angle <= 270) {
                                  acuteAngle = angle - 180
                                } else {
                                  acuteAngle = 360 - angle
                                }
                                return Math.round(acuteAngle)
                              })()}
                            </span>
                            ° from x-axis
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}

// Helper component for arrow heads
function ArrowHead({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  const arrowLength = 10
  const arrowWidth = 6

  const x1 = x - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle)
  const y1 = y - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
  const x2 = x - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle)
  const y2 = y - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)

  return <polygon points={`${x},${y} ${x1},${y1} ${x2},${y2}`} fill={color} />
}

// Calculate resultant vector
function calculateResultantVector(vectors: Vector[]): ResultantVector {
  let totalX = 0
  let totalY = 0

  vectors.forEach((vector) => {
    const dx = vector.endX - vector.startX
    const dy = vector.startY - vector.endY // Invert Y because SVG Y increases downward (upward is positive)
    totalX += dx
    totalY += dy
  })

  const magnitude = Math.sqrt(totalX * totalX + totalY * totalY)
  let angle = Math.atan2(totalY, totalX) * (180 / Math.PI)

  // Normalize angle to 0-360 degrees
  angle = (angle < 0 ? angle + 360 : angle) % 360

  return {
    x: totalX,
    y: totalY,
    magnitude,
    angle,
  }
}
