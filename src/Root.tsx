import React from 'react';
import {Composition} from 'remotion';
import {PPSReel, buildTimeline} from './PPSReel';
import {PPSLearn, learnTimeline, LearnContent} from './PPSLearn';
import {PPS3DTest, FLY_DURATION} from './three/PPS3DTest';
import {PPS3DLearn, LEARN3D_DURATION, Learn3DContent} from './three/PPS3DLearn';
import {EntralpiLearn, entralpiTimeline, EntralpiContent} from './EntralpiLearn';
import pps from '../data/pps.json';
import entralpi from '../data/entralpi-learn.json';
import pps3dLearn from '../data/pps-3d-learn.json';
import ppsLearn from '../data/pps-learn.json';
import ppsLearnWeb from '../data/pps-learn-web.json';
import {RankReel, rankDuration, RankContent} from './RankReel';
import rank from '../data/rank.json';
import rankFitness from '../data/rank-fitness.json';
import {SplitReel, splitTimeline, SplitContent} from './SplitReel';
import pinch from '../data/pinch.json';
import {MuscleTest, MuscleTestContent, muscleTestDuration} from './MuscleOverlay';
import pronTest from '../data/pron-test.json';
import {ElbowReel, elbowParts, ElbowContent} from './ElbowReel';
import elbow from '../data/elbow.json';
import {FootSwap, footTotal, FootContent} from './FootSwap';
import footswap from '../data/footswap.json';
import {BalletReel, balletTotal, BalletContent} from './BalletReel';
import ballet from '../data/ballet.json';
import {Blooper, blooperTotal, BlooperContent} from './Blooper';
import blooper from '../data/blooper.json';
import {IceReel, iceTotal, IceContent} from './IceReel';
import ice from '../data/ice.json';
import ice2 from '../data/ice-v2.json';
import {HomeOverview, homeTotal, HomeContent} from './HomeOverview';
import home from '../data/home.json';
import {HomePicker, pickerParts, PickerContent} from './HomePicker';
import homePicker from '../data/home-picker.json';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Version A: product ad */}
    <Composition
      id="pps"
      component={PPSReel}
      durationInFrames={buildTimeline(pps).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: pps}}
      calculateMetadata={({props}) => ({durationInFrames: buildTimeline(props.content).total})}
    />
    {/* Version B: how-to, no selling */}
    <Composition
      id="pps-learn"
      component={PPSLearn}
      durationInFrames={learnTimeline(ppsLearn as LearnContent).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: ppsLearn as LearnContent}}
      calculateMetadata={({props}) => ({durationInFrames: learnTimeline(props.content).total})}
    />
    {/* Version B2 for the product page: no "save this" line */}
    <Composition id="pps-learn-web" component={PPSLearn} durationInFrames={learnTimeline(ppsLearnWeb as LearnContent).total} fps={30} width={1080} height={1920} defaultProps={{content: ppsLearnWeb as LearnContent}} />
    {/* 3D style test */}
    <Composition id="pps-3d-test" component={PPS3DTest} durationInFrames={FLY_DURATION} fps={30} width={1080} height={1920} />
    {/* Version C: how-to in 3D (from CAD) */}
    <Composition id="pps-3d-learn" component={PPS3DLearn} durationInFrames={LEARN3D_DURATION} fps={30} width={1080} height={1920} defaultProps={{content: pps3dLearn as Learn3DContent}} />
    {/* Entralpi: hangboard at your level */}
    {/* Engagement: rank these (one loop clip + overlay) */}
    <Composition id="rank" component={RankReel} durationInFrames={rankDuration(rank as RankContent)} fps={30} width={1080} height={1920} defaultProps={{content: rank as RankContent}} />
    <Composition id="rank-fitness" component={RankReel} durationInFrames={rankDuration(rankFitness as RankContent)} fps={30} width={1080} height={1920} defaultProps={{content: rankFitness as RankContent}} />
    {/* Split-screen how-to: pinch dynamic vs isometric */}
    <Composition id="pinch" component={SplitReel} durationInFrames={splitTimeline(pinch as SplitContent).total} fps={30} width={1080} height={1920} defaultProps={{content: pinch as SplitContent}} />
    <Composition id="pron-test" component={MuscleTest} durationInFrames={muscleTestDuration(pronTest as unknown as MuscleTestContent)} fps={30} width={1080} height={1920} defaultProps={{content: pronTest as unknown as MuscleTestContent}} />
    <Composition id="elbow" component={ElbowReel} durationInFrames={elbowParts(elbow as unknown as ElbowContent).total} fps={30} width={1080} height={1920} defaultProps={{content: elbow as unknown as ElbowContent}} />
    <Composition id="footswap" component={FootSwap} durationInFrames={footTotal(footswap as unknown as FootContent)} fps={30} width={1080} height={1920} defaultProps={{content: footswap as unknown as FootContent}} />
    <Composition id="ballet" component={BalletReel} durationInFrames={balletTotal(ballet as unknown as BalletContent)} fps={30} width={1080} height={1920} defaultProps={{content: ballet as unknown as BalletContent}} />
    <Composition id="blooper" component={Blooper} durationInFrames={blooperTotal(blooper as unknown as BlooperContent)} fps={30} width={1080} height={1920} defaultProps={{content: blooper as unknown as BlooperContent}} />
    <Composition id="ice" component={IceReel} durationInFrames={iceTotal(ice as unknown as IceContent)} fps={30} width={1080} height={1920} defaultProps={{content: ice as unknown as IceContent}} />
    <Composition id="ice-v2" component={IceReel} durationInFrames={iceTotal(ice2 as unknown as IceContent)} fps={30} width={1080} height={1920} defaultProps={{content: ice2 as unknown as IceContent}} />
    <Composition id="home" component={HomeOverview} durationInFrames={homeTotal(home as unknown as HomeContent)} fps={30} width={1080} height={1920} defaultProps={{content: home as unknown as HomeContent}} />
    <Composition id="home-picker" component={HomePicker} durationInFrames={pickerParts(homePicker as unknown as PickerContent).total} fps={30} width={1080} height={1920} defaultProps={{content: homePicker as unknown as PickerContent}} />
    <Composition id="entralpi-learn" component={EntralpiLearn} durationInFrames={entralpiTimeline(entralpi as EntralpiContent).total} fps={30} width={1080} height={1920} defaultProps={{content: entralpi as EntralpiContent}} />
  </>
);
