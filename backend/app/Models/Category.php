<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'app_categories';
    protected $fillable = ['name', 'description', 'status'];

    public function foods(): HasMany { return $this->hasMany(Food::class, 'category_id'); }
}
