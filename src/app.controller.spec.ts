import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});

describe('AppController config', () => {
  it('devolve o link do jogo de GAME_URL (sem barra no fim)', () => {
    const controller = new AppController(new AppService());
    process.env.GAME_URL = 'http://localhost:2500/';
    expect(controller.config()).toEqual({ gameUrl: 'http://localhost:2500' });
    process.env.GAME_URL = 'javascript:alert(1)';
    expect(controller.config()).toEqual({ gameUrl: null });
    delete process.env.GAME_URL;
    expect(controller.config()).toEqual({ gameUrl: null });
  });
});
