import { Component, OnInit } from '@angular/core'
import { AudioService } from '../../shared/services/audio-service/audio.service'
import { DataService } from '../../shared/services/top-40-service/data.service'
import { PlayerService } from '../../shared/services/player.service'
import { StreamState } from '../../shared/models/streamState'
import { IObject } from '../../shared/models/object'
import { environment } from '../../../environments/environment'
import { combineLatest, Observable } from 'rxjs'

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  //music player
  allFiles: Array<IObject> = []
  songsFiles: Array<IObject> = []
  albumsFiles: Array<IObject> = []
  state: StreamState | null = null
  currentFile: IObject | null = null

  currentFileIndex: number | null = null
  currentFileSource: string | null = null
  currentFileTitle: string | null = null
  currentFileCredit: string | null = null
  currentFileAvatar: string | null = null

  private apiSongsUrl = environment.top40SongsApiUrl
  private apiAlbumsUrl = environment.top40AlbumsApiUrl
  top40Songs$: Observable<IObject[]> | null = null

  public get currentIndex(): number {
    // todo this is not super neat-o.. as it's not garantueed that title_id is unique in the array allFiles. But it's quick solution, for now.. ;)
    return this.allFiles.findIndex((file) => file.title_id === this.currentFile?.title_id)
  }

  constructor(
    public audioService: AudioService,
    public dataService: DataService,
    public playerService: PlayerService,
  ) {
    combineLatest([
      this.dataService.loadTop40Objects(this.apiAlbumsUrl),
      this.dataService.loadTop40Objects(this.apiSongsUrl),
    ]).subscribe(([albums, songs]) => {
      this.allFiles = albums.concat(songs)
    })

    // listen to stream state
    this.audioService.getState().subscribe(state => {
      this.state = state
    })

    // get the value of the current file
    this.playerService.currentFile$.subscribe(this.onCurrentFileChange.bind(this));
  }

  private onCurrentFileChange(file: IObject | undefined): void {
    if (! file) {
      this.currentFile = null
      this.currentFileSource = null
      this.currentFileIndex = null
    } else {

      this.currentFile = file
      this.updateTrackProperties(file)
      this.updateAudioStream(file)

      if (! this.isPlaying()) {
        this.play()
      }

    }
  }

  private updateTrackProperties(file: IObject): void {
    this.currentFileTitle = file.title
    this.currentFileCredit = file.credit
    this.currentFileAvatar = file.cover_img_url_small
  }

  private updateAudioStream(file: IObject): void {
    this.audioService.stop()
    if(!file.itunes_track_preview_url){
      console.log(`Error playing file: ${file.title} does not contain a itunes track preview url`);
    } else {
      this.audioService.playStream(file.itunes_track_preview_url).subscribe()
    }
  }

  pause() {
    this.audioService.pause()
  }

  play() {
    this.audioService.play()
  }

  stop() {
    this.audioService.stop()
  }

  /**
   * TODO as an bonus exercise: Look at the code shared between next() and previous(). Can that be reduced?
   */
  next() {
    const currentIndex = this.currentIndex
    if (currentIndex > -1) {
      const previousFile = this.allFiles[currentIndex +1]
      this.playerService.updateCurrentFile(previousFile)
      if (! this.isPlaying()) {
        this.play()
      }

    } else {
      // todo .. there is no current file loaded... do we want something to happen?
    }

  }

  previous() {
    const currentIndex = this.currentIndex
    if (currentIndex > -1) {
      const previousFile = this.allFiles[currentIndex - 1]
      this.playerService.updateCurrentFile(previousFile)
      if (! this.isPlaying()) {
        this.play()
      }

    } else {
      // todo .. there is no current file loaded... do we want something to happen?
    }


  }

  isFirstPlaying() {
    return this.currentFileIndex === 0
  }

  isLastPlaying() {
    return this.currentFileIndex === this.allFiles.length - 1
  }

  onSliderChangeEnd(change: any) {
    this.audioService.seekTo(change.value)
  }


  ngOnInit(): void {

  }

  private isPlaying(): boolean {
    if (this.state) {
      return this.state.playing
    }
    return false
  }
}