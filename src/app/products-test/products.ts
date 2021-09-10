import { DataControl } from '@remult/angular';
import { Allowed, BackendMethod, Remult, EntityOptions, Filter, IdEntity } from 'remult';
import { Field, Entity, EntityBase, EntityOrderBy, EntityFilter, FieldType } from '../../../projects/core/src/remult3';



@FieldType<GroupsValue>({
  valueConverter: {
    toJson: x => x ? x.value : '',
    fromJson: x => new GroupsValue(x)
  },

})

export class GroupsValue {
  replace(val: string) {
    this.value = val;
  }
  constructor(private value: string) {

  }
}

@Entity("Products", {
  allowApiCrud: true,
  sqlExpression: async () =>
    new Promise(res => setTimeout(() => {
      res('Products')
    }, 10)),
  apiPrefilter: (e) => {

    return new Filter();
  }
})
export class Products extends IdEntity {
  @Field()
  name: string;
  @Field()
  price: number = 0;//= extend(new NumberColumn({ decimalDigits: 2, key: 'price_1' })).dataControl(x => x.getValue = () => this.price.value);
  @Field()
  categoryCode: number;
  @Field() // should be Date
  availableFrom1: Date;
  @Field()
  availableTo: Date;
  @Field()
  archive: boolean;

  @BackendMethod({ allowed: true })
  async doit() {
    await this._.save();
  }
}

