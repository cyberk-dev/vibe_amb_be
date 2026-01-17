import { PipeTransform, Injectable, BadRequestException, Optional } from '@nestjs/common'

@Injectable()
export class ParseBigIntPipe implements PipeTransform {
  constructor(@Optional() private readonly _options: { optional: boolean } = { optional: false }) {}
  transform(value: any) {
    try {
      return BigInt(value)
    } catch {
      if (this._options.optional) return null
      throw new BadRequestException(`Validation failed (bigint is expected)`)
    }
  }
}
