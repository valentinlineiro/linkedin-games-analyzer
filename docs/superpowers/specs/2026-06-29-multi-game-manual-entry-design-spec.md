# Spec: Multi-Game Manual Entry Form

## Goal
Modify the manual entry tab in the LinkedIn Games Tracker to allow entering performance data for all four games (Patches, Zip, Sudoku, Queens) simultaneously under a single date/time.

## User Requirements
- A single date and time selector for the entire batch.
- Input fields for all 4 games (Tu Tiempo and Media Comunidad) must be displayed.
- All 4 games are required fields when submitting the manual entry.
- A single note field applying to all entries in the batch.
- Submitting the form should save all 4 runs simultaneously.

## Technical Architecture & Design

### 1. State Management in `NewRunForm.tsx`
Replace separate state hooks for single game entries with structured objects:
```typescript
const [manualTimes, setManualTimes] = useState<Record<GameType, string>>({
  Patches: '',
  Zip: '',
  Sudoku: '',
  Queens: ''
});

const [manualMedias, setManualMedias] = useState<Record<GameType, string>>({
  Patches: '',
  Zip: '',
  Sudoku: '',
  Queens: ''
});
```

### 2. Properties / Callback Update
Modify `NewRunFormProps` in [NewRunForm.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/NewRunForm.tsx) to support bulk insertion:
```typescript
interface NewRunFormProps {
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  onAddRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
  recordTimes: Record<GameType, number>;
  lastCommunityAverages: Record<GameType, number>;
  isLiveMode?: boolean;
}
```

### 3. Submission Handler (`handleManualSubmit`)
When submitting the manual entry form:
- Extract and parse times and media values for each of the 4 games.
- Validate that all 8 fields are positive numbers.
- Create 4 game run objects, mapping `timestamp` to the selected `fecha` ISO string, and appending the general `nota`.
- Invoke `onAddRuns(runsToAdd)`.
- Batch record checks and anomalies to show a single consolidated Toast notification.
- Clear the input values.

### 4. Component Rendering
Update the JSX in the manual tab of `NewRunForm` to:
- Render a single datetime-local input.
- Render 4 game card rows. Each row contains:
  - Game Name Title.
  - Tu Tiempo (Yo) input.
  - Media Comunidad input.
- Render a single general notes input.
- Render a submit button.

### 5. Integration in `App.tsx`
Update the rendering of `<NewRunForm>` in [App.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/App.tsx) to feed `onImportRuns` as the `onAddRuns` callback, since `onImportRuns` already implements race-condition-free bulk saving for both local and cloud storage.
