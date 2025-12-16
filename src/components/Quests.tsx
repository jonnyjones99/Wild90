import { CommunityChallenges } from './CommunityChallenges'
import './Quests.css'

export function Quests() {
  return (
    <div className="quests">
      <div className="quests-header">
        <h1>Quests</h1>
        <p className="quests-subtitle">Community Challenges</p>
      </div>
      <CommunityChallenges />
    </div>
  )
}
