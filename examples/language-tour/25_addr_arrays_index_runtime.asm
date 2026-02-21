; ZAX lowered .asm trace
; range: $0100..$01B0 (end exclusive)

; func bump_at begin
bump_at:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+disp)                ; 010B: DD 5E 04
ld d, (ix+disp+1)              ; 010E: DD 56 05
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
add HL, HL                     ; 0114: 29
push HL                        ; 0115: E5
ld HL, arr_w                   ; 0116: 21 00 00
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
push AF                        ; 011D: F5
ld A, (HL)                     ; 011E: 7E
inc HL                         ; 011F: 23
ld H, (HL)                     ; 0120: 66
ld L, A                        ; 0121: 6F
pop AF                         ; 0122: F1
inc HL                         ; 0123: 23
push HL                        ; 0124: E5
ld e, (ix+disp)                ; 0125: DD 5E 04
ld d, (ix+disp+1)              ; 0128: DD 56 05
ex de, hl                      ; 012B: EB
push HL                        ; 012C: E5
pop HL                         ; 012D: E1
add HL, HL                     ; 012E: 29
push HL                        ; 012F: E5
ld HL, arr_w                   ; 0130: 21 00 00
pop DE                         ; 0133: D1
add HL, DE                     ; 0134: 19
push HL                        ; 0135: E5
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0138: 73 23 72
ld e, (ix+disp)                ; 013B: DD 5E 04
ld d, (ix+disp+1)              ; 013E: DD 56 05
ex de, hl                      ; 0141: EB
push HL                        ; 0142: E5
pop HL                         ; 0143: E1
push HL                        ; 0144: E5
ld HL, arr_b                   ; 0145: 21 00 00
pop DE                         ; 0148: D1
add HL, DE                     ; 0149: 19
push HL                        ; 014A: E5
pop HL                         ; 014B: E1
ld A, (hl)                     ; 014C: 7E
inc A                          ; 014D: 3C
push AF                        ; 014E: F5
ld e, (ix+disp)                ; 014F: DD 5E 04
ld d, (ix+disp+1)              ; 0152: DD 56 05
ex de, hl                      ; 0155: EB
push HL                        ; 0156: E5
pop HL                         ; 0157: E1
push HL                        ; 0158: E5
ld HL, arr_b                   ; 0159: 21 00 00
pop DE                         ; 015C: D1
add HL, DE                     ; 015D: 19
push HL                        ; 015E: E5
pop HL                         ; 015F: E1
pop AF                         ; 0160: F1
ld (hl), A                     ; 0161: 77
ld e, (ix+disp)                ; 0162: DD 5E 04
ld d, (ix+disp+1)              ; 0165: DD 56 05
ex de, hl                      ; 0168: EB
push HL                        ; 0169: E5
pop HL                         ; 016A: E1
add HL, HL                     ; 016B: 29
push HL                        ; 016C: E5
ld HL, arr_w                   ; 016D: 21 00 00
pop DE                         ; 0170: D1
add HL, DE                     ; 0171: 19
push HL                        ; 0172: E5
pop HL                         ; 0173: E1
push AF                        ; 0174: F5
ld A, (HL)                     ; 0175: 7E
inc HL                         ; 0176: 23
ld H, (HL)                     ; 0177: 66
ld L, A                        ; 0178: 6F
pop AF                         ; 0179: F1
__zax_epilogue_0:
pop DE                         ; 017A: D1
pop BC                         ; 017B: C1
pop AF                         ; 017C: F1
ld SP, IX                      ; 017D: DD F9
pop IX                         ; 017F: DD E1
ret                            ; 0181: C9
; func bump_at end
; func main begin
main:
push IX                        ; 0182: DD E5
ld IX, $0000                   ; 0184: DD 21 00 00
add IX, SP                     ; 0188: DD 39
push AF                        ; 018A: F5
push BC                        ; 018B: C5
push DE                        ; 018C: D5
push HL                        ; 018D: E5
ld HL, $0001                   ; 018E: 21 01 00
push HL                        ; 0191: E5
call bump_at                   ; 0192: CD 00 00
inc SP                         ; 0195: 33
inc SP                         ; 0196: 33
__zax_epilogue_1:
pop HL                         ; 0197: E1
pop DE                         ; 0198: D1
pop BC                         ; 0199: C1
pop AF                         ; 019A: F1
ld SP, IX                      ; 019B: DD F9
pop IX                         ; 019D: DD E1
ret                            ; 019F: C9
; func main end

; symbols:
; label bump_at = $0100
; label __zax_epilogue_0 = $017A
; label main = $0182
; label __zax_epilogue_1 = $0197
; data arr_b = $01A0
; data arr_w = $01A8
