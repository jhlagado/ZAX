; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

; func word_glob_const begin
word_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_words + 2)        ; 010B: 2A 00 00
push DE                        ; 010E: D5
push HL                        ; 010F: E5
ld de, glob_words              ; 0110: 11 00 00
ld HL, $0004                   ; 0113: 21 04 00
add HL, HL                     ; 0116: 29
add HL, DE                     ; 0117: 19
pop DE                         ; 0118: D1
ld (HL), E                     ; 0119: 73
inc HL                         ; 011A: 23
ld (HL), D                     ; 011B: 72
pop DE                         ; 011C: D1
__zax_epilogue_0:
pop DE                         ; 011D: D1
pop BC                         ; 011E: C1
pop AF                         ; 011F: F1
ld SP, IX                      ; 0120: DD F9
pop IX                         ; 0122: DD E1
ret                            ; 0124: C9
; func main begin
; func word_glob_const end
main:
push IX                        ; 0125: DD E5
ld IX, $0000                   ; 0127: DD 21 00 00
add IX, SP                     ; 012B: DD 39
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
push HL                        ; 0130: E5
call word_glob_const           ; 0131: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0134: E1
pop DE                         ; 0135: D1
pop BC                         ; 0136: C1
pop AF                         ; 0137: F1
ld SP, IX                      ; 0138: DD F9
pop IX                         ; 013A: DD E1
ret                            ; 013C: C9
; func main end

; symbols:
; label word_glob_const = $0100
; label __zax_epilogue_0 = $011D
; label main = $0125
; label __zax_epilogue_1 = $0134
; data glob_words = $2000
