export class MotionMeshClient {
  constructor(private apiKey: string, private endpoint: string = "https://motionmesh.co.in") {}

  getApiKey() {
    return this.apiKey;
  }
}
