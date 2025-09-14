"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const ScenarioService_1 = require("../services/ScenarioService");
const router = (0, express_1.Router)();
const scenarioService = new ScenarioService_1.ScenarioService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const scenarios = await scenarioService.getAllScenarios();
    res.json({
        success: true,
        data: scenarios
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const scenario = await scenarioService.getScenarioById(id);
    if (!scenario) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }
    res.json({
        success: true,
        data: scenario
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const scenarioData = req.body;
    const scenario = await scenarioService.createScenario(scenarioData);
    res.status(201).json({
        success: true,
        data: scenario
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const scenario = await scenarioService.updateScenario(id, updateData);
    if (!scenario) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }
    res.json({
        success: true,
        data: scenario
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await scenarioService.deleteScenario(id);
    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: { message: 'Scenario not found' }
        });
    }
    res.json({
        success: true,
        message: 'Scenario deleted successfully'
    });
}));
router.post('/:id/calculate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const results = await scenarioService.calculateScenario(id);
    res.json({
        success: true,
        data: results
    });
}));
router.get('/:id/results', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const results = await scenarioService.getScenarioResults(id);
    res.json({
        success: true,
        data: results
    });
}));
router.post('/:id/monte-carlo', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { iterations = 1000, simulation_name } = req.body;
    const simulation = await scenarioService.runMonteCarloSimulation(id, iterations, simulation_name);
    res.status(201).json({
        success: true,
        data: simulation
    });
}));
router.get('/:id/monte-carlo/:simulationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { simulationId } = req.params;
    const simulation = await scenarioService.getMonteCarloSimulation(simulationId);
    if (!simulation) {
        return res.status(404).json({
            success: false,
            error: { message: 'Monte Carlo simulation not found' }
        });
    }
    res.json({
        success: true,
        data: simulation
    });
}));
exports.default = router;
//# sourceMappingURL=scenarios.js.map