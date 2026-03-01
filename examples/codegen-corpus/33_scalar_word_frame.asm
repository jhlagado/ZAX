; ZAX lowered .asm trace
; range: $0100..$2002 (end exclusive)

; func touch_scalar_word_frame begin
touch_scalar_word_frame:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld E, (IX + $0004)             ; 010B: DD 5E 04
ld D, (IX + $0005)             ; 010E: DD 56 05
ld (IX + $0004), E             ; 0111: DD 73 04
ld (IX + $0005), D             ; 0114: DD 72 05
ex DE, HL                      ; 0117: EB
__zax_epilogue_0:
pop DE                         ; 0118: D1
pop BC                         ; 0119: C1
pop AF                         ; 011A: F1
ld SP, IX                      ; 011B: DD F9
pop IX                         ; 011D: DD E1
ret                            ; 011F: C9
; func main begin
; func touch_scalar_word_frame end
main:
push IX                        ; 0120: DD E5
ld IX, $0000                   ; 0122: DD 21 00 00
add IX, SP                     ; 0126: DD 39
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
push HL                        ; 012B: E5
ld HL, $1234                   ; 012C: 21 34 12
push HL                        ; 012F: E5
call touch_scalar_word_frame   ; 0130: CD 00 00
inc SP                         ; 0133: 33
inc SP                         ; 0134: 33
__zax_epilogue_1:
pop HL                         ; 0135: E1
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func main end

; symbols:
; label touch_scalar_word_frame = $0100
; label __zax_epilogue_0 = $0118
; label main = $0120
; label __zax_epilogue_1 = $0135
; data dummy = $2000
