import { Module } from "@nestjs/common";
import { ChimeService } from "./chime.service";
import { ChimeController } from "./chime.controller";


@Module({
    providers:[ChimeService],
    controllers:[ChimeController],
    exports:[ChimeService]
})
export class ChimeModule{}