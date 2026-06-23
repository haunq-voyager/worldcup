<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePredictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('trash_talk') || ! is_string($this->input('trash_talk'))) {
            return;
        }

        $trashTalk = trim($this->input('trash_talk'));
        $this->merge(['trash_talk' => $trashTalk === '' ? null : $trashTalk]);
    }

    public function rules(): array
    {
        return [
            'match_id'             => ['required', 'integer', 'exists:world_cup_matches,id'],
            'predicted_home_score' => ['required', 'integer', 'min:0', 'max:99'],
            'predicted_away_score' => ['required', 'integer', 'min:0', 'max:99'],
            'trash_talk'            => ['sometimes', 'nullable', 'string', 'max:280'],
        ];
    }
}
