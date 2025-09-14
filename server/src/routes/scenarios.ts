import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ScenarioService } from '../services/ScenarioService';
import { CreateScenarioRequest } from '../types';

const router = Router();
const scenarioService = new ScenarioService();

// Get all scenarios for the user
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const scenarios = await scenarioService.getAllScenarios();
    return res.json({
        success: true,
        data: scenarios
    });
}));

// Get a specific scenario by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const scenario = await scenarioService.getScenarioById(id);

    if (!scenario) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }

    return res.json({
        success: true,
        data: scenario
    });
}));

// Create a new scenario
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const scenarioData: CreateScenarioRequest = req.body;
    const scenario = await scenarioService.createScenario(scenarioData);

    return res.status(201).json({
        success: true,
        data: scenario
    });
}));

// Update an existing scenario
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const updateData = req.body;
    const scenario = await scenarioService.updateScenario(id, updateData);

    if (!scenario) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }

    return res.json({
        success: true,
        data: scenario
    });
}));

// Delete a scenario
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const deleted = await scenarioService.deleteScenario(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }

    return res.json({
        success: true,
        message: 'Scenario deleted successfully'
    });
}));

// Run scenario calculations
router.post('/:id/calculate', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const results = await scenarioService.calculateScenario(id);

    return res.json({
        success: true,
        data: results
    });
}));

// Get scenario results
router.get('/:id/results', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'ID is required' }
        });
    }
    const results = await scenarioService.getScenarioResults(id);

    return res.json({
        success: true,
        data: results
    });
}));

// Run Monte Carlo simulation
router.post('/:id/monte-carlo', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { message: 'Scenario ID is required' }
        });
    }
    const { iterations = 1000, simulation_name } = req.body;
    const simulation = await scenarioService.runMonteCarloSimulation(id, iterations, simulation_name);

    return res.status(201).json({
        success: true,
        data: simulation
    });
}));

// Get Monte Carlo simulation results
router.get('/:id/monte-carlo/:simulationId', asyncHandler(async (req: Request, res: Response) => {
    const { simulationId } = req.params;
    if (!simulationId) {
        return res.status(400).json({
            success: false,
            error: { message: 'Simulation ID is required' }
        });
    }
    const simulation = await scenarioService.getMonteCarloSimulation(simulationId);

    if (!simulation) {
        return res.status(404).json({
            success: false,
            error: { message: 'Monte Carlo simulation not found' }
        });
    }

    return res.json({
        success: true,
        data: simulation
    });
}));

export default router;
